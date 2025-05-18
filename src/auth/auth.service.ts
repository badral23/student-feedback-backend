// src/auth/auth.service.ts
import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PasswordResetToken } from './entities/password-reset.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { RegisterDto } from './dto/register.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { MailService } from '../mail/mail.service';
import { CreateModeratorDto } from './dto/create-moderator.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private mailService: MailService,
    @InjectRepository(PasswordResetToken)
    private passwordResetTokenRepository: Repository<PasswordResetToken>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);
    if (user && (await bcrypt.compare(password, user.password))) {
      // Check if email is verified for students
      if (user.role === UserRole.STUDENT && !user.isEmailVerified) {
        throw new UnauthorizedException('Please verify your email first');
      }

      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: any) {
    const payload = { email: user.email, sub: user.id, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        studentId: user.studentId,
      },
    };
  }
  // src/auth/auth.service.ts (modified registerStudent method to completely bypass email)
  async registerStudent(registerDto: RegisterDto): Promise<any> {
    // Check if user with this username, email, or studentId already exists
    const existingUser = await this.usersRepository.findOne({
      where: [
        { username: registerDto.username },
        { email: registerDto.email },
        { studentId: registerDto.studentId },
      ],
    });

    if (existingUser) {
      throw new ConflictException(
        'Username, email or student ID already exists',
      );
    }

    // Validate that email and studentId match
    const emailPrefix = registerDto.email.split('@')[0];
    if (emailPrefix.toLowerCase() !== registerDto.studentId.toLowerCase()) {
      throw new BadRequestException('Email must match your student ID');
    }

    // Hash the password
    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(registerDto.password, salt);

    // Generate OTP
    const otp = this.generateOTP();
    const otpExpiry = new Date();
    otpExpiry.setMinutes(otpExpiry.getMinutes() + 30); // OTP valid for 30 minutes

    // Create new user with OTP
    // DEVELOPMENT MODE: Set isEmailVerified to true to bypass email verification
    const user = this.usersRepository.create({
      ...registerDto,
      password: hashedPassword,
      role: UserRole.STUDENT,
      otpToken: otp,
      otpExpiry,
      isEmailVerified: true, // Always set to true in development
    });

    await this.usersRepository.save(user);

    // Log OTP instead of sending email
    console.log(`DEVELOPMENT MODE - Account automatically verified`);
    console.log(`OTP for ${user.email}: ${otp} (not required for login)`);

    // Only log attempt, don't actually try to send
    // this.mailService.sendVerificationEmail(user.email, otp)
    //   .catch(err => console.error('Email sending error (safe to ignore in dev):', err.message));

    const { password, otpToken, ...result } = user;
    return {
      ...result,
      message:
        'Registration successful! Your account has been automatically verified for development purposes.',
      // Include OTP in response for development
      developmentInfo: {
        otp: otp,
        note: 'Account is auto-verified, you can login immediately.',
      },
    };
  }
  async verifyOTP(verifyOtpDto: VerifyOtpDto): Promise<any> {
    const user = await this.usersRepository.findOne({
      where: { email: verifyOtpDto.email },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.isEmailVerified) {
      return { message: 'Email already verified' };
    }

    if (!user.otpToken || !user.otpExpiry) {
      throw new BadRequestException(
        'OTP not found or expired. Please request a new one.',
      );
    }

    if (new Date() > user.otpExpiry) {
      throw new BadRequestException(
        'OTP has expired. Please request a new one.',
      );
    }

    if (user.otpToken !== verifyOtpDto.otp) {
      throw new BadRequestException('Invalid OTP');
    }

    // Verify the user
    user.isEmailVerified = true;
    user.otpToken = null;
    user.otpExpiry = null;

    await this.usersRepository.save(user);

    return { message: 'Email verified successfully' };
  }

  async resendOTP(email: string): Promise<any> {
    const user = await this.usersRepository.findOne({
      where: { email },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.isEmailVerified) {
      return { message: 'Email already verified' };
    }

    // Generate new OTP
    const otp = this.generateOTP();
    const otpExpiry = new Date();
    otpExpiry.setMinutes(otpExpiry.getMinutes() + 30);

    user.otpToken = otp;
    user.otpExpiry = otpExpiry;

    await this.usersRepository.save(user);

    // Send verification email with OTP
    await this.mailService.sendVerificationEmail(user.email, otp);

    return { message: 'OTP sent to your email' };
  }

  private generateOTP(): string {
    // Generate a 6-digit OTP
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  async forgotPassword(email: string): Promise<void> {
    // Check if user exists
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      // For security reasons, don't reveal if email exists or not
      return;
    }

    // Generate a reset token
    const token = crypto.randomBytes(32).toString('hex');

    // Save token in database
    const passwordResetToken = this.passwordResetTokenRepository.create({
      email,
      token,
      used: false,
    });

    await this.passwordResetTokenRepository.save(passwordResetToken);

    // Send password reset email
    await this.mailService.sendPasswordResetEmail(email, token);
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    // Find token in database
    const passwordResetToken = await this.passwordResetTokenRepository.findOne({
      where: { token, used: false },
    });

    if (!passwordResetToken) {
      throw new NotFoundException('Invalid or expired token');
    }

    if (passwordResetToken.isExpired()) {
      throw new UnauthorizedException('Token has expired');
    }

    // Find user and update password
    const user = await this.usersService.findByEmail(passwordResetToken.email);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Hash new password
    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update user's password
    await this.usersService.update(user.id, { password: hashedPassword });

    // Mark token as used
    passwordResetToken.used = true;
    await this.passwordResetTokenRepository.save(passwordResetToken);
  }

  async createModerator(
    createModeratorDto: CreateModeratorDto,
    currentUser: any,
  ): Promise<User> {
    // Only admin can create moderator
    if (currentUser.role !== UserRole.ADMIN) {
      throw new UnauthorizedException(
        'Only admin can create moderator accounts',
      );
    }

    // Create moderator with MODERATOR role
    return this.usersService.create({
      ...createModeratorDto,
      role: UserRole.MODERATOR,
      isEmailVerified: true, // No OTP verification for moderators
    });
  }
}

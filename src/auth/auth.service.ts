// src/auth/auth.service.ts
import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PasswordResetToken } from './entities/password-reset.entity';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    @InjectRepository(PasswordResetToken)
    private passwordResetTokenRepository: Repository<PasswordResetToken>,
  ) {}

  async validateUser(username: string, password: string): Promise<any> {
    const user = await this.usersService.findByUsername(username);
    if (user && (await bcrypt.compare(password, user.password))) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: any) {
    const payload = { username: user.username, sub: user.id, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    };
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

    // In a real application, you would send an email with a link containing the token
    // For this example, we'll just log it
    console.log(
      `Password reset link: ${process.env.FRONTEND_URL}/reset-password?token=${token}`,
    );

    // Since we're not actually sending emails, you could return the token for testing
    // return token;
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
}

// src/mail/mail.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private mailerService: MailerService) {}

  async sendVerificationEmail(email: string, otp: string) {
    try {
      // Log OTP for development purposes
      this.logger.log(`Development mode - OTP for ${email}: ${otp}`);

      // Send a simple text email instead of using a template
      await this.mailerService.sendMail({
        to: email,
        subject: 'Verification Code for Student Feedback System',
        text: `Your verification code is: ${otp}\n\nThis code is valid for 30 minutes.\n\nIf you did not request this verification, please ignore this email.`,
        // We won't use the template for now
        // template: './verification',
        // context: {
        //   otp: otp,
        //   email: email,
        // },
      });

      this.logger.log(`Verification email sent to ${email}`);
    } catch (error) {
      this.logger.error(
        `Failed to send verification email to ${email}`,
        error.stack,
      );
      // Don't throw the error, just log it - this allows testing to continue
    }
  }

  async sendPasswordResetEmail(email: string, token: string) {
    try {
      const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

      // Log token for development purposes
      this.logger.log(`Development mode - Reset token for ${email}: ${token}`);
      this.logger.log(`Reset URL: ${resetUrl}`);

      // Send a simple text email instead of using a template
      await this.mailerService.sendMail({
        to: email,
        subject: 'Password Reset Request',
        text: `We received a request to reset your password for the Student Feedback System.\n\nPlease go to the following link to reset your password: ${resetUrl}\n\nThis link will expire in 1 hour.\n\nIf you did not request a password reset, please ignore this email.`,
        // We won't use the template for now
        // template: './password-reset',
        // context: {
        //   resetUrl: resetUrl,
        //   email: email,
        // },
      });

      this.logger.log(`Password reset email sent to ${email}`);
    } catch (error) {
      this.logger.error(
        `Failed to send password reset email to ${email}`,
        error.stack,
      );
      // Don't throw the error, just log it - this allows testing to continue
    }
  }
}

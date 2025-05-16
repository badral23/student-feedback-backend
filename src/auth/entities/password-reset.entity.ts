// src/auth/entities/password-reset.entity.ts
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';

@Entity('password_reset_tokens')
export class PasswordResetToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  email: string;

  @Column()
  token: string;

  @Column({ default: false })
  used: boolean;

  @CreateDateColumn()
  createdAt: Date;

  // Token expires after 1 hour
  isExpired(): boolean {
    const now = new Date();
    const expirationTime = new Date(this.createdAt);
    expirationTime.setHours(expirationTime.getHours() + 1);
    return now > expirationTime;
  }
}

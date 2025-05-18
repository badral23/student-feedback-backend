// src/auth/dto/register.dto.ts
import {
  IsString,
  IsEmail,
  IsNotEmpty,
  MinLength,
  Matches,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'john_doe' })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty({ example: 'B210970304@must.edu.mn' })
  @IsEmail()
  @IsNotEmpty()
  @Matches(/^[A-Z]\d{9}@must\.edu\.mn$/i, {
    message:
      'Email must be a valid university email (e.g., B210970304@must.edu.mn)',
  })
  email: string;

  @ApiProperty({ example: 'StrongPassword123!' })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password: string;

  @ApiProperty({ example: 'B210970304' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[A-Z]\d{9}$/i, {
    message: 'Student ID must be in format B210970304',
  })
  studentId: string;
}

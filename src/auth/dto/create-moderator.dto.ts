// src/auth/dto/create-moderator.dto.ts
import { IsString, IsEmail, IsNotEmpty, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateModeratorDto {
  @ApiProperty({ example: 'moderator_name' })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty({ example: 'moderator@university.edu' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'StrongPassword123!' })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password: string;
}

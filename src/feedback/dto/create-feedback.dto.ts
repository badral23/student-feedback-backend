import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsUUID,
  IsOptional,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FeedbackPriority } from '../entities/feedback.entity';

export class CreateFeedbackDto {
  @ApiProperty({ example: 'Problem with Library Access' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  title: string;

  @ApiProperty({
    example: 'I cannot access the digital library resources from my account.',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  description: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  @IsNotEmpty()
  categoryId: string;

  @ApiPropertyOptional({
    enum: FeedbackPriority,
    default: FeedbackPriority.MEDIUM,
  })
  @IsEnum(FeedbackPriority)
  @IsOptional()
  priority?: FeedbackPriority;
}

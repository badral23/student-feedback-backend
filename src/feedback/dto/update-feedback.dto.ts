// src/feedback/dto/update-feedback.dto.ts
import { PartialType } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { FeedbackStatus } from '../entities/feedback.entity';
import { CreateFeedbackDto } from './create-feedback.dto';

export class UpdateFeedbackDto extends PartialType(CreateFeedbackDto) {
  @ApiPropertyOptional({
    enum: FeedbackStatus,
    example: FeedbackStatus.APPROVED,
  })
  @IsEnum(FeedbackStatus)
  @IsOptional()
  status?: FeedbackStatus;
}

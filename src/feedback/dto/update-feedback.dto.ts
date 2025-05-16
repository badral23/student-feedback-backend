import { PartialType } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUUID, IsDate } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { FeedbackStatus, FeedbackPriority } from '../entities/feedback.entity';
import { CreateFeedbackDto } from './create-feedback.dto';
import { Type } from 'class-transformer';

export class UpdateFeedbackDto extends PartialType(CreateFeedbackDto) {
  @ApiPropertyOptional({ enum: FeedbackStatus })
  @IsEnum(FeedbackStatus)
  @IsOptional()
  status?: FeedbackStatus;

  @ApiPropertyOptional({ type: String, format: 'uuid' })
  @IsUUID()
  @IsOptional()
  assignedToId?: string;

  @ApiPropertyOptional({ type: Date })
  @IsDate()
  @IsOptional()
  @Type(() => Date)
  resolvedAt?: Date;
}

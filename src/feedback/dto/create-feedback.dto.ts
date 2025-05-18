// src/feedback/dto/create-feedback.dto.ts
import { IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateFeedbackDto {
  @ApiProperty({ example: 'My thesis topic proposal' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  title: string;

  @ApiProperty({
    example:
      'I would like to propose a thesis on the topic of machine learning applications in healthcare.',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  description: string;
}

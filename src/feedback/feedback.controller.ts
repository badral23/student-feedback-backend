// src/feedback/feedback.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { FeedbackService } from './feedback.service';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { UpdateFeedbackDto } from './dto/update-feedback.dto';
import { FeedbackQueryDto } from './dto/feedback-query.dto';
import { UserRole } from '../users/entities/user.entity';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('feedback')
@Controller('feedback')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Post()
  @ApiOperation({ summary: 'Create new feedback' })
  @ApiResponse({ status: 201, description: 'Feedback created successfully.' })
  create(
    @Body(ValidationPipe) createFeedbackDto: CreateFeedbackDto,
    @CurrentUser() user,
  ) {
    return this.feedbackService.create(createFeedbackDto, user);
  }

  @Get()
  @ApiOperation({ summary: 'Get all feedbacks with filters' })
  findAll(@Query(ValidationPipe) query: FeedbackQueryDto, @CurrentUser() user) {
    // Students can only see their own feedback
    if (user.role === UserRole.STUDENT) {
      query.userId = user.userId;
    }
    return this.feedbackService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get feedback by id' })
  findOne(@Param('id') id: string, @CurrentUser() user) {
    return this.feedbackService.findOne(id, user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update feedback' })
  update(
    @Param('id') id: string,
    @Body(ValidationPipe) updateFeedbackDto: UpdateFeedbackDto,
    @CurrentUser() user,
  ) {
    return this.feedbackService.update(id, updateFeedbackDto, user);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Delete feedback (Admin only)' })
  remove(@Param('id') id: string) {
    return this.feedbackService.remove(id);
  }

  @Get('statistics/summary')
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Get feedback statistics' })
  getStatistics() {
    return this.feedbackService.getStatistics();
  }
}

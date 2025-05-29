// src/abcdeefk / feedback.service.ts;
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Feedback, FeedbackStatus } from './entities/feedback.entity';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { UpdateFeedbackDto } from './dto/update-feedback.dto';
import { FeedbackQueryDto } from './dto/feedback-query.dto';
import { UserRole } from '../users/entities/user.entity';

@Injectable()
export class FeedbackService {
  constructor(
    @InjectRepository(Feedback)
    private feedbackRepository: Repository<Feedback>,
  ) {}

  async create(
    createFeedbackDto: CreateFeedbackDto,
    user: any,
  ): Promise<Feedback> {
    const feedback = this.feedbackRepository.create({
      ...createFeedbackDto,
      userId: user.userId,
    });

    return this.feedbackRepository.save(feedback);
  }

  async findAll(
    query: FeedbackQueryDto,
  ): Promise<{ data: Feedback[]; total: number }> {
    const {
      status,
      userId,
      assignedToId,
      search,
      page = 1,
      limit = 10,
    } = query;

    const skip = (page - 1) * limit;

    const queryBuilder = this.feedbackRepository
      .createQueryBuilder('feedback')
      .leftJoinAndSelect('feedback.user', 'user');

    // Apply filters
    if (status) {
      queryBuilder.andWhere('feedback.status = :status', { status });
    }

    if (userId) {
      queryBuilder.andWhere('feedback.userId = :userId', { userId });
    }

    if (assignedToId) {
      queryBuilder.andWhere('feedback.assignedToId = :assignedToId', {
        assignedToId,
      });
    }

    if (search) {
      queryBuilder.andWhere(
        '(feedback.title ILIKE :search OR feedback.description ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    // Get total count
    const total = await queryBuilder.getCount();

    // Apply pagination
    queryBuilder.orderBy('feedback.createdAt', 'DESC').skip(skip).take(limit);

    const data = await queryBuilder.getMany();

    return { data, total };
  }

  async findOne(id: string, user: any): Promise<Feedback> {
    const feedback = await this.feedbackRepository.findOne({
      where: { id },
      relations: ['user', 'comments', 'comments.user'],
    });

    if (!feedback) {
      throw new NotFoundException(`Feedback with ID "${id}" not found`);
    }

    // Check permissions - only admin, moderator, or the owner can see the feedback
    if (
      user.role !== UserRole.ADMIN &&
      user.role !== UserRole.MODERATOR &&
      feedback.userId !== user.userId
    ) {
      throw new ForbiddenException(
        'You do not have permission to view this feedback',
      );
    }

    return feedback;
  }

  async update(
    id: string,
    updateFeedbackDto: UpdateFeedbackDto,
    user: any,
  ): Promise<Feedback> {
    const feedback = await this.findOne(id, user);

    // Only admin or moderator can update status
    if (
      updateFeedbackDto.status &&
      user.role !== UserRole.ADMIN &&
      user.role !== UserRole.MODERATOR
    ) {
      throw new ForbiddenException(
        'Only moderators and admins can update feedback status',
      );
    }

    // Only the owner can update content (title, description)
    if (
      (updateFeedbackDto.title || updateFeedbackDto.description) &&
      user.role !== UserRole.ADMIN &&
      feedback.userId !== user.userId
    ) {
      throw new ForbiddenException(
        'You can only update your own feedback content',
      );
    }

    // If status is changed to COMPLETED, set resolvedAt date
    if (
      updateFeedbackDto.status === FeedbackStatus.COMPLETED &&
      feedback.status !== FeedbackStatus.COMPLETED
    ) {
      feedback.resolvedAt = new Date();
    }

    Object.assign(feedback, updateFeedbackDto);
    return this.feedbackRepository.save(feedback);
  }

  async remove(
    id: string,
    user: any,
  ): Promise<{ message: string; id: string }> {
    try {
      // First find the feedback to verify it exists
      const feedback = await this.feedbackRepository.findOne({
        where: { id },
        relations: ['user', 'comments'],
      });

      if (!feedback) {
        throw new NotFoundException(`Feedback with ID "${id}" not found`);
      }

      // Check if user has permission to delete this feedback
      // Only allow admin or the owner of the feedback
      if (user.role !== UserRole.ADMIN && feedback.userId !== user.userId) {
        throw new ForbiddenException(
          'Only administrators and feedback owners can delete feedback',
        );
      }

      // If we're here, user has permission. Delete any related comments first
      // This assumes comments have a foreign key constraint
      if (feedback.comments && feedback.comments.length > 0) {
        await this.feedbackRepository.manager.getRepository('comments').delete({
          feedbackId: id,
        });
      }

      // Now delete the feedback itself
      const result = await this.feedbackRepository.delete(id);

      if (result.affected === 0) {
        throw new Error(`Failed to delete feedback with ID "${id}"`);
      }

      return {
        message: 'Feedback deleted successfully',
        id: id,
      };
    } catch (error) {
      // Provide more detailed error information
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }

      // Log the detailed error for debugging
      console.error('Error deleting feedback:', error);

      throw new Error(
        `Could not delete feedback. Reason: ${
          error.message || 'Unknown error'
        }`,
      );
    }
  }

  async getStatistics(): Promise<any> {
    // Get status counts
    const statusCounts = await this.feedbackRepository
      .createQueryBuilder('feedback')
      .select('feedback.status', 'status')
      .addSelect('COUNT(feedback.id)', 'count')
      .groupBy('feedback.status')
      .getRawMany();

    // Transform statusCounts into an object for easier access
    const statusMap = statusCounts.reduce((acc, item) => {
      acc[item.status] = parseInt(item.count);
      return acc;
    }, {});

    // Get total feedback count
    const total = await this.feedbackRepository.count();

    return {
      total,
      new: statusMap[FeedbackStatus.NEW] || 0,
      completed: statusMap[FeedbackStatus.COMPLETED] || 0,
      rejected: statusMap[FeedbackStatus.REJECTED] || 0,
    };
  }
}

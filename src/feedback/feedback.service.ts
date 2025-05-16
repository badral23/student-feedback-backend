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
import { Category } from '../categories/entities/category.entity';

@Injectable()
export class FeedbackService {
  constructor(
    @InjectRepository(Feedback)
    private feedbackRepository: Repository<Feedback>,
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
  ) {}

  async create(
    createFeedbackDto: CreateFeedbackDto,
    user: any,
  ): Promise<Feedback> {
    // Check if category exists
    const category = await this.categoryRepository.findOne({
      where: { id: createFeedbackDto.categoryId },
    });

    if (!category) {
      throw new NotFoundException(
        `Category with ID "${createFeedbackDto.categoryId}" not found`,
      );
    }

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
      priority,
      categoryId,
      userId,
      assignedToId,
      search,
      page = 1, // Default to page 1
      limit = 10, // Default to 10 items per page
    } = query;

    const skip = (page - 1) * limit;

    // Rest of your code remains the same
    const queryBuilder = this.feedbackRepository
      .createQueryBuilder('feedback')
      .leftJoinAndSelect('feedback.user', 'user')
      .leftJoinAndSelect('feedback.category', 'category')
      .leftJoinAndSelect('category.department', 'department');

    // Apply filters
    // ... your existing filter code ...

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
      relations: [
        'user',
        'category',
        'category.department',
        'comments',
        'comments.user',
      ],
    });

    if (!feedback) {
      throw new NotFoundException(`Feedback with ID "${id}" not found`);
    }

    // Check permissions - only admin, teacher, or the owner can see the feedback
    if (
      user.role !== UserRole.ADMIN &&
      user.role !== UserRole.TEACHER &&
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

    // Check permissions - only admin or teacher can update status and assign
    if (
      (updateFeedbackDto.status || updateFeedbackDto.assignedToId) &&
      user.role !== UserRole.ADMIN &&
      user.role !== UserRole.TEACHER
    ) {
      throw new ForbiddenException(
        'You do not have permission to update status or assign feedback',
      );
    }

    // Check if the user is the owner of the feedback
    if (
      (updateFeedbackDto.title ||
        updateFeedbackDto.description ||
        updateFeedbackDto.categoryId) &&
      user.role !== UserRole.ADMIN &&
      feedback.userId !== user.userId
    ) {
      throw new ForbiddenException(
        'You can only update your own feedback content',
      );
    }

    // If status is changed to RESOLVED, set resolvedAt date
    if (
      updateFeedbackDto.status === FeedbackStatus.RESOLVED &&
      feedback.status !== FeedbackStatus.RESOLVED
    ) {
      updateFeedbackDto.resolvedAt = new Date();
    }

    Object.assign(feedback, updateFeedbackDto);
    return this.feedbackRepository.save(feedback);
  }

  async remove(id: string): Promise<void> {
    const result = await this.feedbackRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Feedback with ID "${id}" not found`);
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

    // Get priority counts
    const priorityCounts = await this.feedbackRepository
      .createQueryBuilder('feedback')
      .select('feedback.priority', 'priority')
      .addSelect('COUNT(feedback.id)', 'count')
      .groupBy('feedback.priority')
      .getRawMany();

    // Get category counts
    const categoryCounts = await this.feedbackRepository
      .createQueryBuilder('feedback')
      .leftJoin('feedback.category', 'category')
      .select('category.name', 'categoryName')
      .addSelect('COUNT(feedback.id)', 'count')
      .groupBy('category.name')
      .getRawMany();

    // Get feedback count by day for the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const feedbackByDay = await this.feedbackRepository
      .createQueryBuilder('feedback')
      .select("DATE_TRUNC('day', feedback.createdAt)", 'date')
      .addSelect('COUNT(feedback.id)', 'count')
      .where('feedback.createdAt >= :thirtyDaysAgo', { thirtyDaysAgo })
      .groupBy("DATE_TRUNC('day', feedback.createdAt)")
      .orderBy("DATE_TRUNC('day', feedback.createdAt)", 'ASC')
      .getRawMany();

    return {
      statusCounts,
      priorityCounts,
      categoryCounts,
      feedbackByDay,
      totalFeedback: await this.feedbackRepository.count(),
      unresolvedFeedback: await this.feedbackRepository.count({
        where: { status: FeedbackStatus.NEW },
      }),
    };
  }
}

// src/comments/comments.service.ts
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Comment } from './entities/comment.entity';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { UserRole } from '../users/entities/user.entity';
import { Feedback } from '../feedback/entities/feedback.entity';

@Injectable()
export class CommentsService {
  constructor(
    @InjectRepository(Comment)
    private commentsRepository: Repository<Comment>,
    @InjectRepository(Feedback)
    private feedbackRepository: Repository<Feedback>,
  ) {}

  async create(
    createCommentDto: CreateCommentDto,
    user: any,
  ): Promise<Comment> {
    // Check if feedback exists
    const feedback = await this.feedbackRepository.findOne({
      where: { id: createCommentDto.feedbackId },
      relations: ['user'],
    });

    if (!feedback) {
      throw new NotFoundException(
        `Feedback with ID "${createCommentDto.feedbackId}" not found`,
      );
    }

    // Check if user has permission to comment
    // Only admin, moderator, or the owner of the feedback can comment
    if (
      user.role !== UserRole.ADMIN &&
      user.role !== UserRole.MODERATOR &&
      feedback.userId !== user.userId
    ) {
      throw new ForbiddenException(
        'You do not have permission to comment on this feedback',
      );
    }

    // Only admin or moderator can create internal comments
    if (
      createCommentDto.isInternal &&
      user.role !== UserRole.ADMIN &&
      user.role !== UserRole.MODERATOR
    ) {
      throw new ForbiddenException(
        'Only admin or moderator can create internal comments',
      );
    }

    const comment = this.commentsRepository.create({
      ...createCommentDto,
      userId: user.userId,
    });

    return this.commentsRepository.save(comment);
  }

  async findAll(feedbackId: string, user: any): Promise<Comment[]> {
    // Check if feedback exists
    const feedback = await this.feedbackRepository.findOne({
      where: { id: feedbackId },
      relations: ['user'],
    });

    if (!feedback) {
      throw new NotFoundException(`Feedback with ID "${feedbackId}" not found`);
    }

    // Check if user has permission to view comments
    // Only admin, moderator, or the owner of the feedback can view comments
    if (
      user.role !== UserRole.ADMIN &&
      user.role !== UserRole.MODERATOR &&
      feedback.userId !== user.userId
    ) {
      throw new ForbiddenException(
        'You do not have permission to view comments for this feedback',
      );
    }

    const queryBuilder = this.commentsRepository
      .createQueryBuilder('comment')
      .leftJoinAndSelect('comment.user', 'user')
      .where('comment.feedbackId = :feedbackId', { feedbackId })
      .orderBy('comment.createdAt', 'ASC');

    // If not admin or moderator, filter out internal comments
    if (user.role !== UserRole.ADMIN && user.role !== UserRole.MODERATOR) {
      queryBuilder.andWhere('comment.isInternal = :isInternal', {
        isInternal: false,
      });
    }

    return queryBuilder.getMany();
  }

  async findOne(id: string, user: any): Promise<Comment> {
    const comment = await this.commentsRepository.findOne({
      where: { id },
      relations: ['user', 'feedback', 'feedback.user'],
    });

    if (!comment) {
      throw new NotFoundException(`Comment with ID "${id}" not found`);
    }

    // Check if user has permission to view this comment
    // Only admin, moderator, or the owner of the feedback can view comment
    if (
      user.role !== UserRole.ADMIN &&
      user.role !== UserRole.MODERATOR &&
      comment.feedback.userId !== user.userId
    ) {
      throw new ForbiddenException(
        'You do not have permission to view this comment',
      );
    }

    // Check if comment is internal and user is not admin or moderator
    if (
      comment.isInternal &&
      user.role !== UserRole.ADMIN &&
      user.role !== UserRole.MODERATOR
    ) {
      throw new ForbiddenException(
        'You do not have permission to view internal comments',
      );
    }

    return comment;
  }

  async update(
    id: string,
    updateCommentDto: UpdateCommentDto,
    user: any,
  ): Promise<Comment> {
    const comment = await this.findOne(id, user);

    // Check if user has permission to update this comment
    // Only the author of the comment can update it
    if (user.role !== UserRole.ADMIN && comment.userId !== user.userId) {
      throw new ForbiddenException('You can only update your own comments');
    }

    // If trying to change isInternal flag, check permissions
    if (
      updateCommentDto.isInternal !== undefined &&
      updateCommentDto.isInternal !== comment.isInternal &&
      user.role !== UserRole.ADMIN &&
      user.role !== UserRole.MODERATOR
    ) {
      throw new ForbiddenException(
        'Only admin or moderator can change internal flag',
      );
    }

    Object.assign(comment, updateCommentDto);
    return this.commentsRepository.save(comment);
  }

  async remove(id: string, user: any): Promise<void> {
    const comment = await this.findOne(id, user);

    // Check if user has permission to delete this comment
    // Only the author of the comment or admin can delete it
    if (user.role !== UserRole.ADMIN && comment.userId !== user.userId) {
      throw new ForbiddenException('You can only delete your own comments');
    }

    await this.commentsRepository.remove(comment);
  }
}

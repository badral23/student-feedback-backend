import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './entities/category.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private categoriesRepository: Repository<Category>,
  ) {}

  async create(createCategoryDto: CreateCategoryDto): Promise<Category> {
    // Check if category with the same name in the same department already exists
    const existingCategory = await this.categoriesRepository.findOne({
      where: {
        name: createCategoryDto.name,
        departmentId: createCategoryDto.departmentId,
      },
    });

    if (existingCategory) {
      throw new ConflictException(
        `Category with name "${createCategoryDto.name}" already exists in this department`,
      );
    }

    const category = this.categoriesRepository.create(createCategoryDto);
    return this.categoriesRepository.save(category);
  }

  async findAll(departmentId?: string): Promise<Category[]> {
    const queryBuilder = this.categoriesRepository
      .createQueryBuilder('category')
      .leftJoinAndSelect('category.department', 'department');

    if (departmentId) {
      queryBuilder.where('category.departmentId = :departmentId', {
        departmentId,
      });
    }

    return queryBuilder.getMany();
  }

  async findOne(id: string): Promise<Category> {
    const category = await this.categoriesRepository.findOne({
      where: { id },
      relations: ['department'],
    });

    if (!category) {
      throw new NotFoundException(`Category with ID "${id}" not found`);
    }

    return category;
  }

  async update(
    id: string,
    updateCategoryDto: UpdateCategoryDto,
  ): Promise<Category> {
    // Check if category exists
    const category = await this.findOne(id);

    // Check for name conflict if name is updated
    if (
      updateCategoryDto.name &&
      updateCategoryDto.name !== category.name &&
      (updateCategoryDto.departmentId === category.departmentId ||
        !updateCategoryDto.departmentId)
    ) {
      const departmentId =
        updateCategoryDto.departmentId || category.departmentId;
      const existingCategory = await this.categoriesRepository.findOne({
        where: {
          name: updateCategoryDto.name,
          departmentId,
        },
      });

      if (existingCategory) {
        throw new ConflictException(
          `Category with name "${updateCategoryDto.name}" already exists in this department`,
        );
      }
    }

    Object.assign(category, updateCategoryDto);
    return this.categoriesRepository.save(category);
  }

  async remove(id: string): Promise<void> {
    const result = await this.categoriesRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Category with ID "${id}" not found`);
    }
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { Repository } from 'typeorm';
import { CreateMenuItemDto } from './dto/create-menu.dto';
import { UpdateMenuDto } from './dto/update-menu.dto';
import { Menu } from './entities/menu.entity';

export interface MenuQuery {
  search?: string;
  category?: string;
  isAvailable?: boolean;
}

@Injectable()
export class MenuService {
  constructor(
    @InjectRepository(Menu)
    private readonly menuRepository: Repository<Menu>,
  ) {}

  create(createMenuItemDto: CreateMenuItemDto): Promise<Menu> {
    return this.menuRepository.save(
      this.menuRepository.create(createMenuItemDto),
    );
  }

  findAll(query: MenuQuery = {}): Promise<Menu[]> {
    const queryBuilder = this.menuRepository
      .createQueryBuilder('menu')
      .orderBy('menu.category', 'ASC')
      .addOrderBy('menu.name', 'ASC');

    if (query.search?.trim()) {
      queryBuilder.andWhere('LOWER(menu.name) LIKE LOWER(:search)', {
        search: `%${query.search.trim()}%`,
      });
    }
    if (query.category) {
      queryBuilder.andWhere('menu.category = :category', {
        category: query.category,
      });
    }
    if (query.isAvailable !== undefined) {
      queryBuilder.andWhere('menu.isAvailable = :isAvailable', {
        isAvailable: query.isAvailable,
      });
    }

    return queryBuilder.getMany();
  }

  async findOne(id: string): Promise<Menu> {
    const menu = await this.menuRepository.findOneBy({ id });
    if (!menu) {
      throw new NotFoundException('Không tìm thấy món ăn');
    }
    return menu;
  }

  async update(id: string, updateMenuDto: UpdateMenuDto): Promise<Menu> {
    const menu = await this.findOne(id);
    Object.assign(menu, updateMenuDto);
    return this.menuRepository.save(menu);
  }

  async setImage(id: string, filename: string): Promise<Menu> {
    const menu = await this.findOne(id);
    menu.imageUrl = `/menu/images/${filename}`;
    return this.menuRepository.save(menu);
  }

  async getImagePath(filename: string): Promise<string> {
    const menu = await this.menuRepository.findOneBy({
      imageUrl: `/menu/images/${filename}`,
    });
    const imagePath = join(process.cwd(), 'uploads', 'menu', filename);
    if (!menu || !existsSync(imagePath)) {
      throw new NotFoundException('Không tìm thấy hình ảnh');
    }
    return imagePath;
  }

  async remove(id: string): Promise<Menu> {
    const menu = await this.findOne(id);
    menu.isAvailable = false;
    return this.menuRepository.save(menu);
  }
}

import { NotFoundException } from '@nestjs/common';
import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateMenuItemDto } from './dto/create-menu.dto';
import { Menu } from './entities/menu.entity';
import { MenuService } from './menu.service';

describe('MenuService', () => {
  let service: MenuService;
  let repository: jest.Mocked<
    Pick<
      Repository<Menu>,
      'create' | 'save' | 'findOneBy' | 'createQueryBuilder'
    >
  >;

  beforeEach(async () => {
    repository = {
      create: jest.fn((menu) => menu as Menu),
      save: jest.fn((menu) => Promise.resolve(menu as Menu)),
      findOneBy: jest.fn(),
      createQueryBuilder: jest.fn(),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MenuService,
        { provide: getRepositoryToken(Menu), useValue: repository },
      ],
    }).compile();

    service = module.get<MenuService>(MenuService);
  });

  it('creates a menu item with its submitted fields', async () => {
    const dto: CreateMenuItemDto = {
      name: 'Phở',
      price: 12,
      category: 'Main',
      isAvailable: true,
    };

    await expect(service.create(dto)).resolves.toEqual(dto);
    expect(repository.create).toHaveBeenCalledWith(dto);
    expect(repository.save).toHaveBeenCalled();
  });

  it('throws when a menu item does not exist', async () => {
    repository.findOneBy.mockResolvedValue(null);

    await expect(service.findOne('missing-id')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('archives an item instead of deleting historical menu references', async () => {
    const menu = { id: 'menu-id', isAvailable: true } as Menu;
    repository.findOneBy.mockResolvedValue(menu);

    await service.remove(menu.id);

    expect(menu.isAvailable).toBe(false);
    expect(repository.save).toHaveBeenCalledWith(menu);
  });
});

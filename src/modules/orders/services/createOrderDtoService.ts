import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import { Menu } from '../../menu/entities/menu.entity';
import { QueryOrderDto } from '../dto/query-order.dto';
import { InventoryTransaction } from '../../inventory/entities/inventory-transaction.entity';
import { Inventory } from '../../inventory/entities/inventory.entity';
import { MenuItemIngredient } from '../../menu/entities/menu-item-ingredient.entity';
import { Order } from '../entities/order.entity';
import { OrderItem } from '../entities/order-item.entity';
import { OrderStatus } from '../entities/order.entity';
import { assertCanTransition } from './order-state-machine';
import { CreateOrderDto } from '../dto/create-order.dto';
import { InventoryTxType } from '../../inventory/entities/inventory-transaction.entity';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    private readonly dataSource: DataSource,
  ) {}

  create(dto: CreateOrderDto): Promise<Order> {
    return this.dataSource.transaction(async (manager) => {
      const menuIds = [...new Set(dto.items.map((item) => item.menuItemId))];
      const menuItems = await manager.find(Menu, {
        where: { id: In(menuIds) },
      });

      if (menuItems.length !== menuIds.length) {
        throw new NotFoundException('Có món không tồn tại');
      }

      const menuById = new Map(
        menuItems.map((menuItem) => [menuItem.id, menuItem]),
      );
      for (const menuItem of menuItems) {
        if (!menuItem.isAvailable) {
          throw new BadRequestException(`Món "${menuItem.name}" tạm hết`);
        }
      }

      const recipes = await manager.find(MenuItemIngredient, {
        where: { menuItemId: In(menuIds) },
      });
      const menuIdsWithRecipes = new Set(
        recipes.map((recipe) => recipe.menuItemId),
      );
      const menuWithoutRecipe = menuItems.find(
        (menuItem) => !menuIdsWithRecipes.has(menuItem.id),
      );
      if (menuWithoutRecipe) {
        throw new BadRequestException(
          `Món "${menuWithoutRecipe.name}" chưa có công thức nguyên liệu`,
        );
      }

      const requiredByInventory = new Map<string, number>();
      for (const item of dto.items) {
        for (const recipe of recipes) {
          if (recipe.menuItemId === item.menuItemId) {
            requiredByInventory.set(
              recipe.inventoryId,
              (requiredByInventory.get(recipe.inventoryId) ?? 0) +
                Math.round(recipe.quantityPerUnit * 1000) * item.quantity,
            );
          }
        }
      }

      const inventoryIds = [...requiredByInventory.keys()].sort();
      const inventories = inventoryIds.length
        ? await manager.find(Inventory, {
            where: { id: In(inventoryIds) },
            order: { id: 'ASC' },
            lock: { mode: 'pessimistic_write' },
          })
        : [];
      if (inventories.length !== inventoryIds.length) {
        throw new NotFoundException('Không tìm thấy nguyên liệu trong kho');
      }

      for (const inventory of inventories) {
        const requiredMilliUnits = requiredByInventory.get(inventory.id)!;
        const availableMilliUnits = Math.round(inventory.quantity * 1000);
        if (availableMilliUnits < requiredMilliUnits) {
          throw new BadRequestException(
            `Không đủ "${inventory.name}": cần ${requiredMilliUnits / 1000}${inventory.unit}, còn ${inventory.quantity}${inventory.unit}`,
          );
        }
        inventory.quantity = (availableMilliUnits - requiredMilliUnits) / 1000;
      }
      await manager.save(inventories);

      const items = dto.items.map((item) => {
        const menuItem = menuById.get(item.menuItemId)!;
        return manager.create(OrderItem, {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          menuItemId: menuItem.id,

          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          name: menuItem.name,

          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          unitPrice: menuItem.price,
          quantity: item.quantity,
          note: item.note,
        });
      });

      const order = manager.create(Order, {
        code: `ORD-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${randomUUID()}`,
        tableNumber: dto.tableNumber,
        customerName: dto.customerName,
        note: dto.note,
        status: OrderStatus.PENDING,
        totalAmount:
          items.reduce(
            (sum, item) =>
              sum + Math.round(item.unitPrice * 100) * item.quantity,
            0,
          ) / 100,
        items,
      });
      const savedOrder = await manager.save(order);

      if (inventories.length) {
        await manager.save(
          inventories.map((inventory) =>
            manager.create(InventoryTransaction, {
              inventory,
              type: InventoryTxType.ORDER_DEDUCT,
              quantity: requiredByInventory.get(inventory.id)! / 1000,
              orderId: savedOrder.id,
            }),
          ),
        );
      }

      return savedOrder;
    });
  }

  async findAll(query: QueryOrderDto) {
    const queryBuilder = this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.items', 'item');

    if (query.status) {
      queryBuilder.andWhere('order.status = :status', { status: query.status });
    }

    const search = query.search?.trim();
    if (search) {
      queryBuilder.andWhere(
        '(order.code ILIKE :search OR order.tableNumber ILIKE :search OR order.customerName ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    queryBuilder
      .orderBy(`order.${query.sortBy}`, query.order)
      .skip((query.page - 1) * query.limit)
      .take(query.limit);

    const [data, total] = await queryBuilder.getManyAndCount();
    return {
      data,
      meta: {
        total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async findOne(id: string): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id },
      relations: { items: true },
    });
    if (!order) {
      throw new NotFoundException('Không tìm thấy đơn');
    }
    return order;
  }

  updateStatus(id: string, status: OrderStatus): Promise<Order> {
    return this.dataSource.transaction(async (manager) => {
      const order = await manager.findOne(Order, {
        where: { id },
        relations: { items: true },
        lock: { mode: 'pessimistic_write' },
      });
      if (!order) {
        throw new NotFoundException('Không tìm thấy đơn');
      }

      assertCanTransition(order.status, status);
      if (status === OrderStatus.CANCELLED) {
        await this.restoreInventory(manager, order.id);
      }

      order.status = status;
      return manager.save(order);
    });
  }

  private async restoreInventory(manager: EntityManager, orderId: string) {
    const deductions = await manager.find(InventoryTransaction, {
      where: { orderId, type: InventoryTxType.ORDER_DEDUCT },
      relations: { inventory: true },
    });
    const restoreByInventory = new Map<string, number>();
    for (const deduction of deductions) {
      const inventoryId = deduction.inventory.id;
      restoreByInventory.set(
        inventoryId,
        (restoreByInventory.get(inventoryId) ?? 0) +
          Math.round(deduction.quantity * 1000),
      );
    }

    const inventoryIds = [...restoreByInventory.keys()].sort();
    if (inventoryIds.length === 0) {
      return;
    }

    const inventories = await manager.find(Inventory, {
      where: { id: In(inventoryIds) },
      order: { id: 'ASC' },
      lock: { mode: 'pessimistic_write' },
    });
    if (inventories.length !== inventoryIds.length) {
      throw new NotFoundException('Không tìm thấy nguyên liệu để hoàn kho');
    }

    for (const inventory of inventories) {
      inventory.quantity =
        (Math.round(inventory.quantity * 1000) +
          restoreByInventory.get(inventory.id)!) /
        1000;
    }
    await manager.save(inventories);
    await manager.save(
      inventories.map((inventory) =>
        manager.create(InventoryTransaction, {
          inventory,
          type: InventoryTxType.ORDER_RESTORE,
          quantity: restoreByInventory.get(inventory.id)! / 1000,
          orderId,
        }),
      ),
    );
  }
}

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';

import { DataSource, EntityManager, In, Repository } from 'typeorm';

import { Menu } from '../../menu/entities/menu.entity';
import { Inventory } from '../../inventory/entities/inventory.entity';
import {
  InventoryTransaction,
  InventoryTxType,
} from '../../inventory/entities/inventory-transaction.entity';
import { MenuItemIngredient } from '../../menu/entities/menu-item-ingredient.entity';

import { CreateOrderDto } from '../dto/create-order.dto';
import { QueryOrderDto } from '../dto/query-order.dto';

import { Order, OrderStatus } from '../entities/order.entity';
import { OrderItem } from '../entities/order-item.entity';

import { assertCanTransition } from './order-state-machine';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,

    private readonly dataSource: DataSource,
  ) {}

  // =====================================================
  // 1. TẠO ĐƠN HÀNG
  // =====================================================

  async create(dto: CreateOrderDto): Promise<Order> {
    // Kiểm tra dữ liệu cơ bản ngay cả khi service
    // được gọi trực tiếp mà không thông qua Controller.
    if (!dto.tableNumber?.trim()) {
      throw new BadRequestException('Số bàn không được để trống');
    }

    if (!Array.isArray(dto.items) || dto.items.length === 0) {
      throw new BadRequestException('Đơn hàng phải có ít nhất một món');
    }

    for (const item of dto.items) {
      if (
        !item.menuItemId ||
        !Number.isInteger(item.quantity) ||
        item.quantity < 1
      ) {
        throw new BadRequestException(
          'Thông tin món ăn hoặc số lượng không hợp lệ',
        );
      }
    }

    return this.dataSource.transaction(async (manager) => {
      // Lấy danh sách ID món ăn không trùng lặp.
      const menuIds = [...new Set(dto.items.map((item) => item.menuItemId))];

      // Kiểm tra món ăn có tồn tại không.
      const menuItems = await manager.find(Menu, {
        where: {
          id: In(menuIds),
        },
      });

      if (menuItems.length !== menuIds.length) {
        throw new NotFoundException('Có món ăn không tồn tại');
      }

      const menuById = new Map(menuItems.map((item) => [item.id, item]));

      // Kiểm tra trạng thái kinh doanh của món.
      for (const menuItem of menuItems) {
        if (!menuItem.isAvailable) {
          throw new BadRequestException(
            `Món "${menuItem.name}" hiện đang tạm hết`,
          );
        }

        if (
          !Number.isFinite(Number(menuItem.price)) ||
          Number(menuItem.price) < 0
        ) {
          throw new BadRequestException(
            `Giá món "${menuItem.name}" không hợp lệ`,
          );
        }
      }

      // Lấy công thức nguyên liệu của các món.
      const recipes = await manager.find(MenuItemIngredient, {
        where: {
          menuItemId: In(menuIds),
        },
      });

      // Kiểm tra món nào chưa có công thức.
      const menuIdsWithRecipes = new Set(
        recipes.map((recipe) => recipe.menuItemId),
      );

      const menuWithoutRecipe = menuItems.find(
        (item) => !menuIdsWithRecipes.has(item.id),
      );

      if (menuWithoutRecipe) {
        throw new BadRequestException(
          `Món "${menuWithoutRecipe.name}" chưa có công thức nguyên liệu`,
        );
      }

      // Tính tổng nguyên liệu cần dùng.
      // Dùng đơn vị milli-unit để hạn chế sai số số thực.
      const requiredByInventory = new Map<string, number>();

      for (const item of dto.items) {
        for (const recipe of recipes) {
          if (recipe.menuItemId !== item.menuItemId) {
            continue;
          }

          const quantityPerUnit = Number(recipe.quantityPerUnit);

          if (!Number.isFinite(quantityPerUnit) || quantityPerUnit <= 0) {
            throw new BadRequestException('Công thức nguyên liệu không hợp lệ');
          }

          const requiredMilliUnits =
            Math.round(quantityPerUnit * 1000) * item.quantity;

          requiredByInventory.set(
            recipe.inventoryId,
            (requiredByInventory.get(recipe.inventoryId) ?? 0) +
              requiredMilliUnits,
          );
        }
      }

      // Sắp xếp ID để hạn chế deadlock khi nhiều đơn
      // cùng trừ nguyên liệu trong kho.
      const inventoryIds = [...requiredByInventory.keys()].sort();

      // Khóa các bản ghi kho trong transaction.
      const inventories = inventoryIds.length
        ? await manager.find(Inventory, {
            where: {
              id: In(inventoryIds),
            },
            order: {
              id: 'ASC',
            },
            lock: {
              mode: 'pessimistic_write',
            },
          })
        : [];

      if (inventories.length !== inventoryIds.length) {
        throw new NotFoundException('Không tìm thấy nguyên liệu trong kho');
      }

      // Kiểm tra số lượng và trừ kho.
      for (const inventory of inventories) {
        const requiredMilliUnits = requiredByInventory.get(inventory.id)!;

        const availableMilliUnits = Math.round(
          Number(inventory.quantity) * 1000,
        );

        if (
          !Number.isFinite(availableMilliUnits) ||
          availableMilliUnits < requiredMilliUnits
        ) {
          throw new BadRequestException(
            `Không đủ nguyên liệu "${inventory.name}". ` +
              `Cần: ${requiredMilliUnits / 1000}${inventory.unit}, ` +
              `hiện có: ${inventory.quantity}${inventory.unit}`,
          );
        }

        inventory.quantity = (availableMilliUnits - requiredMilliUnits) / 1000;
      }

      await manager.save(inventories);

      // Tạo các món trong đơn hàng.
      const items = dto.items.map((item) => {
        const menuItem = menuById.get(item.menuItemId)!;

        return manager.create(OrderItem, {
          menuItemId: menuItem.id,
          name: menuItem.name,
          unitPrice: Number(menuItem.price),
          quantity: item.quantity,
          note: item.note?.trim() || undefined,
        });
      });

      // Tính tổng tiền theo đơn vị đồng nhỏ nhất
      // (nhân 100) để tránh sai số khi cộng số thực.
      const totalAmount =
        items.reduce(
          (sum, item) => sum + Math.round(item.unitPrice * 100) * item.quantity,
          0,
        ) / 100;

      if (!Number.isFinite(totalAmount) || totalAmount < 0) {
        throw new BadRequestException('Tổng tiền đơn hàng không hợp lệ');
      }

      // Tạo đơn hàng.
      const order = manager.create(Order, {
        code:
          `ORD-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-` +
          randomUUID(),

        tableNumber: dto.tableNumber.trim(),

        customerName: dto.customerName?.trim() || undefined,

        note: dto.note?.trim() || undefined,

        status: OrderStatus.PENDING,

        totalAmount,

        items,
      });

      const savedOrder = await manager.save(order);

      // Ghi lịch sử trừ kho.
      if (inventories.length > 0) {
        const transactions = inventories.map((inventory) =>
          manager.create(InventoryTransaction, {
            inventory,
            type: InventoryTxType.ORDER_DEDUCT,
            quantity: requiredByInventory.get(inventory.id)! / 1000,
            orderId: savedOrder.id,
          }),
        );

        await manager.save(transactions);
      }

      // Nếu bất kỳ bước nào phía trên lỗi,
      // transaction sẽ rollback cả đơn và tồn kho.
      return savedOrder;
    });
  }

  // =====================================================
  // 2. LẤY DANH SÁCH ĐƠN HÀNG
  // =====================================================

  async findAll(query: QueryOrderDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    if (
      !Number.isInteger(page) ||
      page < 1 ||
      !Number.isInteger(limit) ||
      limit < 1 ||
      limit > 100
    ) {
      throw new BadRequestException('Thông tin phân trang không hợp lệ');
    }

    // Chỉ cho phép sắp xếp theo các trường đã định nghĩa.
    const sortColumns = {
      createdAt: 'order.createdAt',
      totalAmount: 'order.totalAmount',
    } as const;

    const sortColumn = sortColumns[query.sortBy ?? 'createdAt'];

    if (!sortColumn) {
      throw new BadRequestException('Trường sắp xếp không hợp lệ');
    }

    const sortOrder = query.order ?? 'DESC';

    if (!['ASC', 'DESC'].includes(sortOrder)) {
      throw new BadRequestException('Thứ tự sắp xếp không hợp lệ');
    }

    const queryBuilder = this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.items', 'item');

    // Lọc theo trạng thái.
    if (query.status) {
      if (!Object.values(OrderStatus).includes(query.status)) {
        throw new BadRequestException('Trạng thái lọc không hợp lệ');
      }

      queryBuilder.andWhere('order.status = :status', {
        status: query.status,
      });
    }

    // Tìm theo mã đơn, số bàn hoặc tên khách.
    const search = query.search?.trim();

    if (search) {
      queryBuilder.andWhere(
        `(
          order.code LIKE :search
          OR order.tableNumber LIKE :search
          OR order.customerName LIKE :search
        )`,
        {
          search: `%${search}%`,
        },
      );
    }

    // Phân trang và sắp xếp.
    queryBuilder
      .orderBy(sortColumn, sortOrder)
      .addOrderBy('order.id', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // =====================================================
  // 3. LẤY CHI TIẾT ĐƠN HÀNG
  // =====================================================

  async findOne(id: string): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: {
        id,
      },
      relations: {
        items: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Không tìm thấy đơn hàng');
    }

    return order;
  }

  // =====================================================
  // 4. CẬP NHẬT TRẠNG THÁI ĐƠN HÀNG
  // =====================================================

  async updateStatus(id: string, status: OrderStatus): Promise<Order> {
    if (!Object.values(OrderStatus).includes(status)) {
      throw new BadRequestException('Trạng thái đơn hàng không hợp lệ');
    }

    return this.dataSource.transaction(async (manager) => {
      // Khóa đơn hàng để tránh hai yêu cầu cập nhật
      // đồng thời gây sai lệch trạng thái hoặc hoàn kho.
      const order = await manager.findOne(Order, {
        where: {
          id,
        },
        relations: {
          items: true,
        },
        lock: {
          mode: 'pessimistic_write',
        },
      });

      if (!order) {
        throw new NotFoundException('Không tìm thấy đơn hàng');
      }

      // Kiểm tra quy tắc chuyển trạng thái.
      assertCanTransition(order.status, status);

      // Nếu hủy đơn thì hoàn nguyên liệu.
      if (status === OrderStatus.CANCELLED) {
        await this.restoreInventory(manager, order.id);
      }

      order.status = status;

      return manager.save(order);
    });
  }

  // =====================================================
  // 5. HOÀN TRẢ NGUYÊN LIỆU KHI HỦY ĐƠN
  // =====================================================

  private async restoreInventory(
    manager: EntityManager,
    orderId: string,
  ): Promise<void> {
    // Lấy các giao dịch trừ kho của đơn hàng.
    const deductions = await manager.find(InventoryTransaction, {
      where: {
        orderId,
        type: InventoryTxType.ORDER_DEDUCT,
      },
      relations: {
        inventory: true,
      },
    });

    if (deductions.length === 0) {
      // Đơn hàng không có lịch sử trừ kho.
      // Không có nguyên liệu để hoàn trả.
      return;
    }

    // Tổng hợp số lượng cần hoàn theo từng nguyên liệu.
    const restoreByInventory = new Map<string, number>();

    for (const deduction of deductions) {
      if (!deduction.inventory) {
        throw new NotFoundException(
          'Không tìm thấy nguyên liệu trong lịch sử giao dịch',
        );
      }

      const inventoryId = deduction.inventory.id;

      const quantityMilliUnits = Math.round(Number(deduction.quantity) * 1000);

      if (!Number.isFinite(quantityMilliUnits) || quantityMilliUnits <= 0) {
        throw new BadRequestException('Dữ liệu giao dịch trừ kho không hợp lệ');
      }

      restoreByInventory.set(
        inventoryId,
        (restoreByInventory.get(inventoryId) ?? 0) + quantityMilliUnits,
      );
    }

    const inventoryIds = [...restoreByInventory.keys()].sort();

    // Khóa các bản ghi nguyên liệu trước khi hoàn kho.
    const inventories = await manager.find(Inventory, {
      where: {
        id: In(inventoryIds),
      },
      order: {
        id: 'ASC',
      },
      lock: {
        mode: 'pessimistic_write',
      },
    });

    if (inventories.length !== inventoryIds.length) {
      throw new NotFoundException('Không tìm thấy nguyên liệu để hoàn kho');
    }

    // Cộng lại số lượng nguyên liệu.
    for (const inventory of inventories) {
      const currentQuantity = Number(inventory.quantity);

      if (!Number.isFinite(currentQuantity) || currentQuantity < 0) {
        throw new BadRequestException(
          `Tồn kho "${inventory.name}" không hợp lệ`,
        );
      }

      const restoredQuantity = restoreByInventory.get(inventory.id)!;

      inventory.quantity =
        (Math.round(currentQuantity * 1000) + restoredQuantity) / 1000;
    }

    await manager.save(inventories);

    // Ghi lịch sử hoàn kho.
    const restoreTransactions = inventories.map((inventory) =>
      manager.create(InventoryTransaction, {
        inventory,
        type: InventoryTxType.ORDER_RESTORE,
        quantity: restoreByInventory.get(inventory.id)! / 1000,
        orderId,
      }),
    );

    await manager.save(restoreTransactions);
  }
}

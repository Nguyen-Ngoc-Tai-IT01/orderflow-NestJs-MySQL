import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { CreateTableDto } from './dto/create-table.dto';
import { UpdateTableDto } from './dto/update-table.dto';
import {
  RestaurantTable,
  TableStatus,
} from './entities/restaurant-table.entity';

@Injectable()
export class TablesService {
  constructor(
    @InjectRepository(RestaurantTable)
    private readonly tableRepository: Repository<RestaurantTable>,
  ) {}

  create(dto: CreateTableDto): Promise<RestaurantTable> {
    return this.tableRepository.save(this.tableRepository.create(dto));
  }

  findAll(status?: TableStatus): Promise<RestaurantTable[]> {
    return this.tableRepository.find({
      where: status ? { status } : {},
      order: { tableNumber: 'ASC' },
    });
  }

  async findOne(id: string): Promise<RestaurantTable> {
    const table = await this.tableRepository.findOneBy({ id });
    if (!table) {
      throw new NotFoundException('Không tìm thấy bàn');
    }
    return table;
  }

  async update(id: string, dto: UpdateTableDto): Promise<RestaurantTable> {
    const table = await this.findOne(id);
    Object.assign(table, dto);
    if (dto.status === TableStatus.AVAILABLE) {
      this.clearReservation(table);
    }
    return this.tableRepository.save(table);
  }

  async reserve(
    id: string,
    dto: CreateReservationDto,
  ): Promise<RestaurantTable> {
    const table = await this.findOne(id);
    if (table.status === TableStatus.OCCUPIED) {
      throw new BadRequestException('Không thể đặt bàn đang phục vụ');
    }
    if (dto.partySize > table.capacity) {
      throw new BadRequestException('Số khách vượt quá sức chứa của bàn');
    }

    Object.assign(table, {
      customerName: dto.customerName,
      customerPhone: dto.customerPhone,
      reservationAt: new Date(dto.reservationAt),
      partySize: dto.partySize,
      note: dto.note,
      status: TableStatus.RESERVED,
    });
    return this.tableRepository.save(table);
  }

  async cancelReservation(id: string): Promise<RestaurantTable> {
    const table = await this.findOne(id);
    if (table.status === TableStatus.RESERVED) {
      table.status = TableStatus.AVAILABLE;
      this.clearReservation(table);
    }
    return this.tableRepository.save(table);
  }

  async remove(id: string): Promise<void> {
    const table = await this.findOne(id);
    await this.tableRepository.remove(table);
  }

  private clearReservation(table: RestaurantTable): void {
    table.customerName = null;
    table.customerPhone = null;
    table.reservationAt = null;
    table.partySize = null;
    table.note = null;
  }
}

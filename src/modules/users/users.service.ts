import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';
import { Role } from '../../common/enums/role.enum';

type PublicUser = Pick<
  User,
  'id' | 'username' | 'fullName' | 'role' | 'isActive' | 'createdAt' | 'updatedAt'
>;

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  // ---------------------------------------------------------
  // Nhóm hàm phục vụ Authentication
  // ---------------------------------------------------------
  async findByUsername(username: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { username } });
  }

  async validateUser(
    username: string,
    pass: string,
  ): Promise<PublicUser | null> {
    const user = await this.findByUsername(username);
    if (!user || !user.isActive) {
      return null;
    }

    const passwordMatches = await bcrypt.compare(pass, user.password);
    if (!passwordMatches) {
      return null;
    }

    const { password, ...result } = user;
    return result;
  }

  // ---------------------------------------------------------
  // Nhóm hàm CRUD quản lý nhân viên (Giải quyết TS2339)
  // ---------------------------------------------------------
  async create(
    createUserDto: CreateUserDto,
  ): Promise<PublicUser> {
    const user = this.usersRepository.create(createUserDto);
    return this.toPublicUser(await this.usersRepository.save(user));
  }

  async findAll(): Promise<PublicUser[]> {
    const users = await this.usersRepository.find({ order: { fullName: 'ASC' } });
    return users.map((user) => this.toPublicUser(user));
  }

  async findOne(id: string): Promise<PublicUser> {
    const user = await this.findUserEntity(id);
    return this.toPublicUser(user);
  }

  async update(
    id: string,
    updateUserDto: UpdateUserDto,
  ): Promise<PublicUser> {
    const user = await this.findUserEntity(id);
    const nextRole = updateUserDto.role ?? user.role;
    const nextIsActive = updateUserDto.isActive ?? user.isActive;

    if (
      user.role === Role.ADMIN &&
      user.isActive &&
      (nextRole !== Role.ADMIN || !nextIsActive) &&
      (await this.countActiveAdmins()) <= 1
    ) {
      throw new BadRequestException(
        'Hệ thống cần ít nhất một quản trị viên đang hoạt động',
      );
    }

    Object.assign(user, updateUserDto);
    return this.toPublicUser(await this.usersRepository.save(user));
  }

  async remove(id: string): Promise<{ deleted: boolean }> {
    const user = await this.findUserEntity(id);
    if (
      user.role === Role.ADMIN &&
      user.isActive &&
      (await this.countActiveAdmins()) <= 1
    ) {
      throw new BadRequestException(
        'Không thể xóa quản trị viên đang hoạt động cuối cùng',
      );
    }

    await this.usersRepository.remove(user);
    return { deleted: true };
  }

  private async findUserEntity(id: string): Promise<User> {
    const user = await this.usersRepository.findOneBy({ id });
    if (!user) {
      throw new NotFoundException('Không tìm thấy nhân viên');
    }
    return user;
  }

  private countActiveAdmins(): Promise<number> {
    return this.usersRepository.count({
      where: { role: Role.ADMIN, isActive: true },
    });
  }

  private toPublicUser(user: User): PublicUser {
    const { password, ...publicUser } = user;
    return publicUser;
  }
}

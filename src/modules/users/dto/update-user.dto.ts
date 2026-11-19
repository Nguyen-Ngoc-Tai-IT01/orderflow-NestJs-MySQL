import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { Role } from '../../../common/enums/role.enum';

export class UpdateUserDto {
  @ValidateIf((_object, value) => value !== undefined)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1, { message: 'Họ và tên không được để trống' })
  @MaxLength(100)
  fullName?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MinLength(6, { message: 'Mật khẩu phải có ít nhất 6 ký tự' })
  @MaxLength(50, { message: 'Mật khẩu không được vượt quá 50 ký tự' })
  password?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsEnum(Role)
  role?: Role;

  @ValidateIf((_object, value) => value !== undefined)
  @IsBoolean()
  isActive?: boolean;
}

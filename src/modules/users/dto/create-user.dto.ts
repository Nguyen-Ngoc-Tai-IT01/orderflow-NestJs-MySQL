import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { Role } from '../../../common/enums/role.enum';

export class CreateUserDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Matches(/^[A-Za-z0-9._]{3,50}$/, {
    message:
      'Tên đăng nhập phải dài 3–50 ký tự và chỉ gồm chữ không dấu, số, dấu chấm hoặc gạch dưới',
  })
  username!: string;

  @IsString()
  @MinLength(6, { message: 'Mật khẩu phải có ít nhất 6 ký tự' })
  @MaxLength(50, { message: 'Mật khẩu không được vượt quá 50 ký tự' })
  password!: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1, { message: 'Họ và tên không được để trống' })
  @MaxLength(100)
  fullName!: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsEnum(Role)
  role?: Role;

  @ValidateIf((_object, value) => value !== undefined)
  @IsBoolean()
  isActive?: boolean;
}

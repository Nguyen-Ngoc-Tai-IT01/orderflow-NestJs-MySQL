import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { createReadStream, mkdirSync } from 'node:fs';
import { extname, join } from 'node:path';
import { randomUUID } from 'node:crypto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MenuService } from './menu.service';
import { CreateMenuItemDto } from './dto/create-menu.dto';
import { UpdateMenuDto } from './dto/update-menu.dto';

@Controller('menu')
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  // Lấy danh sách món ăn: công khai để Dashboard đọc dữ liệu.
  @Get()
  findAll(
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('isAvailable') isAvailable?: string,
  ) {
    if (isAvailable !== undefined && !['true', 'false'].includes(isAvailable)) {
      throw new BadRequestException('isAvailable phải là true hoặc false');
    }

    return this.menuService.findAll({
      search,
      category,
      isAvailable:
        isAvailable === undefined ? undefined : isAvailable === 'true',
    });
  }

  // Lấy ảnh món ăn.
  @Get('images/:filename')
  @Header('Cache-Control', 'public, max-age=3600')
  async getImage(@Param('filename') filename: string): Promise<StreamableFile> {
    if (!/^[\da-f-]{36}\.(png|jpe?g|webp|gif)$/i.test(filename)) {
      throw new BadRequestException('Tên hình ảnh không hợp lệ');
    }

    const imagePath = await this.menuService.getImagePath(filename);

    const contentTypes: Record<string, string> = {
      '.gif': 'image/gif',
      '.jpeg': 'image/jpeg',
      '.jpg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
    };

    return new StreamableFile(createReadStream(imagePath), {
      type: contentTypes[extname(filename).toLowerCase()],
    });
  }

  // Lấy chi tiết một món ăn.
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.menuService.findOne(id);
  }

  // Thêm món ăn.
  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() createMenuItemDto: CreateMenuItemDto) {
    return this.menuService.create(createMenuItemDto);
  }

  // Tải ảnh món ăn.
  @Post(':id/image')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('image', {
      storage: diskStorage({
        destination: (_request, _file, callback) => {
          const directory = join(process.cwd(), 'uploads', 'menu');
          mkdirSync(directory, { recursive: true });
          callback(null, directory);
        },
        filename: (_request, file, callback) => {
          const extensions: Record<string, string> = {
            'image/jpeg': '.jpg',
            'image/png': '.png',
            'image/webp': '.webp',
            'image/gif': '.gif',
          };

          callback(
            null,
            `${randomUUID()}${extensions[file.mimetype] || '.jpg'}`,
          );
        },
      }),
      limits: {
        fileSize: 5 * 1024 * 1024,
        files: 1,
      },
      fileFilter: (_request, file, callback) => {
        const allowedTypes = [
          'image/jpeg',
          'image/png',
          'image/webp',
          'image/gif',
        ];

        if (!allowedTypes.includes(file.mimetype)) {
          callback(
            new BadRequestException(
              'Chỉ chấp nhận ảnh JPEG, PNG, WebP hoặc GIF',
            ),
            false,
          );
          return;
        }

        callback(null, true);
      },
    }),
  )
  uploadImage(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    if (!file) {
      throw new BadRequestException('Vui lòng chọn hình ảnh');
    }

    return this.menuService.setImage(id, file.filename);
  }

  // Cập nhật món ăn.
  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateMenuDto: UpdateMenuDto,
  ) {
    return this.menuService.update(id, updateMenuDto);
  }

  // Xóa mềm: chuyển món sang trạng thái ngừng kinh doanh.
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.menuService.remove(id);
  }
}

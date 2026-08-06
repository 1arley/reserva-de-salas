import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RoomService } from '@/room/room.service';
import { CreateRoomDto } from '@/room/dto/create-room.dto';
import { UpdateRoomDto } from '@/room/dto/update-room.dto';
import { FilterRoomDto } from '@/room/dto/filter-room.dto';
import { JwtAuthGuard } from '@/auth/jwt-auth.guard';
import { RolesGuard } from '@/auth/roles.guard';
import { Roles } from '@/auth/roles.decorators';

@ApiTags('rooms')
@Controller('rooms')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class RoomController {
  constructor(private readonly roomService: RoomService) {}

  @Get()
  findAll(@Query() filters: FilterRoomDto) {
    return this.roomService.findAll(filters);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.roomService.findOne(id);
  }

  @Post()
  @Roles('ADMIN', 'SUPERADMIN')
  create(@Body() dto: CreateRoomDto) {
    return this.roomService.create(dto);
  }

  @Patch(':id')
  @Roles('ADMIN', 'SUPERADMIN')
  update(@Param('id') id: string, @Body() dto: UpdateRoomDto) {
    return this.roomService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @Roles('ADMIN', 'SUPERADMIN')
  remove(@Param('id') id: string) {
    return this.roomService.remove(id);
  }
}

import { PartialType } from '@nestjs/swagger';
import { CreateRoomDto } from '@/room/dto/create-room.dto';

export class UpdateRoomDto extends PartialType(CreateRoomDto) {}

import { Module } from '@nestjs/common';
import { RoomService } from '@/room/room.service';
import { RoomController } from '@/room/room.controller';
import { PrismaModule } from '@/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [RoomController],
  providers: [RoomService],
  exports: [RoomService],
})
export class RoomModule {}

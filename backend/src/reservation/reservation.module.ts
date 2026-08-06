import { Module } from '@nestjs/common';
import { ReservationService } from '@/reservation/reservation.service';
import { ReservationController } from '@/reservation/reservation.controller';
import { PrismaModule } from '@/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ReservationController],
  providers: [ReservationService],
  exports: [ReservationService],
})
export class ReservationModule {}

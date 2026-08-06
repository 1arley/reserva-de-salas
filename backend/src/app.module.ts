import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from '@/app.controller';
import { AppService } from '@/app.service';
import { PrismaModule } from '@/prisma/prisma.module';
import { AuthModule } from '@/auth/auth.module';
import { UserModule } from '@/user/user.module';
import { RoomModule } from '@/room/room.module';
import { ReservationModule } from '@/reservation/reservation.module';
import { FavoriteModule } from '@/favorite/favorite.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: [
        '.env',
        '.env.local',
        ...(process.env.ENV_TEST ? [process.env.ENV_TEST] : []),
      ],
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    UserModule,
    RoomModule,
    ReservationModule,
    FavoriteModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

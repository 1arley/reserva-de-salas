import { Module } from '@nestjs/common';
import { FavoriteService } from '@/favorite/favorite.service';
import { FavoriteController } from '@/favorite/favorite.controller';
import { PrismaModule } from '@/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [FavoriteController],
  providers: [FavoriteService],
  exports: [FavoriteService],
})
export class FavoriteModule {}

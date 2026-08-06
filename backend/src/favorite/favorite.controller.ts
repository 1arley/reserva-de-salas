import { Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { FavoriteService } from '@/favorite/favorite.service';
import { JwtAuthGuard } from '@/auth/jwt-auth.guard';
import type { AuthenticatedRequest } from '@/common/interfaces/request.interface';

@ApiTags('favorites')
@Controller('favorites')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class FavoriteController {
  constructor(private readonly favoriteService: FavoriteService) {}

  @Get()
  findAll(@Req() req: AuthenticatedRequest) {
    return this.favoriteService.findAll(req.user.id);
  }

  @Post(':roomId')
  toggle(@Req() req: AuthenticatedRequest, @Param('roomId') roomId: string) {
    return this.favoriteService.toggle(req.user.id, roomId);
  }
}

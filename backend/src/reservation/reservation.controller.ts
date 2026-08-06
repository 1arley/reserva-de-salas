import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { ReservationService } from '@/reservation/reservation.service';
import { CreateReservationDto } from '@/reservation/dto/create-reservation.dto';
import { FilterReservationDto } from '@/reservation/dto/filter-reservation.dto';
import { JwtAuthGuard } from '@/auth/jwt-auth.guard';
import { RolesGuard } from '@/auth/roles.guard';
import { Roles } from '@/auth/roles.decorators';
import type { AuthenticatedRequest } from '@/common/interfaces/request.interface';

@ApiTags('reservations')
@Controller('reservations')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class ReservationController {
  constructor(private readonly reservationService: ReservationService) {}

  @Post()
  create(@Req() req: AuthenticatedRequest, @Body() dto: CreateReservationDto) {
    return this.reservationService.create(req.user.id, dto);
  }

  @Get()
  findMy(
    @Req() req: AuthenticatedRequest,
    @Query() filters: FilterReservationDto,
  ) {
    return this.reservationService.findMy(req.user.id, filters);
  }

  @Get('schedule/weekly')
  weeklySchedule(@Query('weekStart') weekStart?: string) {
    return this.reservationService.weeklySchedule(weekStart);
  }

  @Get('history')
  history(
    @Req() req: AuthenticatedRequest,
    @Query() filters: FilterReservationDto,
  ) {
    return this.reservationService.history(req.user.id, filters);
  }

  @Get('export/csv')
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename="reservas.csv"')
  async exportCsv(@Req() req: AuthenticatedRequest, @Res() res: Response) {
    const csv = await this.reservationService.exportCsv(
      req.user.id,
      req.user.role,
    );
    res.send(csv);
  }

  @Get('stats')
  @Roles('ADMIN', 'SUPERADMIN')
  getStats() {
    return this.reservationService.getStats();
  }

  @Get('admin')
  @Roles('ADMIN', 'SUPERADMIN')
  findAllAdmin(@Query() filters: FilterReservationDto) {
    return this.reservationService.findAllAdmin(filters);
  }

  @Get(':id')
  findOne(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.reservationService.findOne(id, req.user.id, req.user.role);
  }

  @Patch(':id/cancel')
  @HttpCode(HttpStatus.OK)
  cancel(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.reservationService.cancel(id, req.user.id, req.user.role);
  }
}

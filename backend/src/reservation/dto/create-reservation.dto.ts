import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';

export class CreateReservationDto {
  @ApiProperty({ example: 'room-uuid' })
  @IsUUID()
  roomId!: string;

  @ApiProperty({ example: '2026-08-10T14:00:00.000Z' })
  @IsDateString()
  startTime!: string;

  @ApiProperty({ example: '2026-08-10T15:00:00.000Z' })
  @IsDateString()
  endTime!: string;

  @ApiPropertyOptional({ example: 'Reunião de planejamento' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  notes?: string;
}

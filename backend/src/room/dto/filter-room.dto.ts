import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { RoomStatus } from '@prisma/client';

export class FilterRoomDto {
  @ApiPropertyOptional({ description: 'Busca por nome' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: RoomStatus })
  @IsOptional()
  @IsEnum(RoomStatus)
  status?: RoomStatus;

  @ApiPropertyOptional({ description: 'Capacidade mínima' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  minCapacity?: number;

  @ApiPropertyOptional({ description: 'Disponível a partir de (ISO)' })
  @IsOptional()
  @IsDateString()
  availableFrom?: string;

  @ApiPropertyOptional({ description: 'Disponível até (ISO)' })
  @IsOptional()
  @IsDateString()
  availableTo?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}

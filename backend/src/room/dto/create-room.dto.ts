import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsInt,
  IsOptional,
  IsArray,
  IsEnum,
  Min,
  MinLength,
} from 'class-validator';
import { RoomStatus } from '@prisma/client';

export class CreateRoomDto {
  @ApiProperty({ example: 'Sala de Reunião A' })
  @IsString()
  @MinLength(2, { message: 'O nome deve ter pelo menos 2 caracteres' })
  name!: string;

  @ApiPropertyOptional({ example: 'Sala com projetor e lousa' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 10 })
  @IsInt()
  @Min(1, { message: 'A capacidade deve ser pelo menos 1' })
  capacity!: number;

  @ApiPropertyOptional({ example: ['projetor', 'whiteboard'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  resources?: string[];

  @ApiPropertyOptional({ enum: RoomStatus, default: RoomStatus.AVAILABLE })
  @IsOptional()
  @IsEnum(RoomStatus)
  status?: RoomStatus;
}

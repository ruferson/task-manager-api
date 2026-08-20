import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { TaskStatus } from '@prisma/client';

export class CreateTaskDto {
  @IsString({ message: 'El título debe ser un texto' })
  @IsNotEmpty({ message: 'El título es obligatorio' })
  title!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsUUID('4', { message: 'El ID del proyecto debe ser un UUID válido' })
  @IsNotEmpty({ message: 'El ID del proyecto es obligatorio' })
  projectId!: string;

  @IsEnum(TaskStatus, { message: 'El estado no es válido' })
  @IsOptional()
  status?: TaskStatus;
}

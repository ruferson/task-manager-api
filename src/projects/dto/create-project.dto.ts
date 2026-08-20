import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateProjectDto {
  @IsString({ message: 'El título debe ser un texto' })
  @IsNotEmpty({ message: 'El título es obligatorio' })
  title!: string;

  @IsString({ message: 'La descripción debe ser un texto' })
  @IsOptional()
  description?: string;
}

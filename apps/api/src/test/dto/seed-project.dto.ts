import { IsOptional, IsString, MinLength } from 'class-validator';

export class SeedProjectDto {
  @IsString()
  @MinLength(1)
  ownerId!: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;
}

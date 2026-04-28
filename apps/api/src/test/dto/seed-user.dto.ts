import { IsIn, IsOptional, IsString } from 'class-validator';

export class SeedUserDto {
  @IsOptional()
  @IsIn(['admin', 'member'])
  role?: 'admin' | 'member';

  @IsOptional()
  @IsString()
  emailPrefix?: string;
}

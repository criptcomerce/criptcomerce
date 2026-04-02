import {
  IsString,
  IsNumber,
  IsPositive,
  IsOptional,
  IsUrl,
  MinLength,
  MaxLength,
} from 'class-validator';

export class CreateProductDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsNumber()
  @IsPositive()
  price_usd: number;

  @IsOptional()
  @IsUrl()
  image_url?: string;
}

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  price_usd?: number;

  @IsOptional()
  @IsUrl()
  image_url?: string;
}

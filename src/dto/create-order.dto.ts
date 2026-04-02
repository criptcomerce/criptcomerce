import {
  IsEnum,
  IsString,
  IsEmail,
  IsUUID,
  IsOptional,
  IsInt,
  Min,
  Max,
  IsPositive,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';
import { OrderCurrency, OrderStatus } from '../entities/order.entity';

export class CreateOrderDto {
  @IsOptional()
  @IsUUID()
  product_id?: string;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  amount_usd?: number;

  @IsEnum(OrderCurrency, { message: 'currency deve ser BTC, USDT ou ETH' })
  currency: OrderCurrency;

  @IsOptional()
  @IsString()
  customer_name?: string;

  @IsOptional()
  @IsEmail()
  customer_email?: string;

  @IsOptional()
  @IsString()
  shipping_address?: string;
}

export class ListOrdersDto {
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @IsOptional()
  @IsEnum(OrderCurrency)
  currency?: OrderCurrency;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export class RecentOrdersDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 10;
}

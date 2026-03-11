import { IsEnum, IsNumber, IsPositive } from 'class-validator';
import { OrderCurrency } from '../entities/order.entity';

export class CreateOrderDto {
  @IsNumber()
  @IsPositive()
  amount_usd: number;

  @IsEnum(OrderCurrency, { message: 'currency deve ser BTC ou USDT' })
  currency: OrderCurrency;
}

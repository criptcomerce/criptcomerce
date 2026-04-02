import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
  UsePipes,
  ValidationPipe,
  ParseUUIDPipe,
  Logger,
} from '@nestjs/common';
import { Throttle }     from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { OrderService } from '../services/order.service';
import { CreateOrderDto, ListOrdersDto, RecentOrdersDto } from '../dto/create-order.dto';

@Controller()
export class OrderController {
  private readonly logger = new Logger(OrderController.name);

  constructor(private readonly orderService: OrderService) {}

  /**
   * POST /orders — requer JWT
   * user_id extraído do token — nunca aceito do body
   */
  @Post('orders')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
  async createOrder(@Request() req: any, @Body() dto: CreateOrderDto) {
    this.logger.log(`Recebido: ${JSON.stringify(dto)}`);
    return this.orderService.createOrder(req.user.id, dto);
  }

  /** GET /orders */
  @Get('orders')
  @UsePipes(new ValidationPipe({ transform: true }))
  async listOrders(@Query() filters: ListOrdersDto) {
    return this.orderService.listOrders(filters);
  }

  /** GET /orders/recent */
  @Get('orders/recent')
  @UsePipes(new ValidationPipe({ transform: true }))
  async getRecentOrders(@Query() dto: RecentOrdersDto) {
    return this.orderService.getRecentOrders(dto);
  }

  /** GET /orders/:id */
  @Get('orders/:id')
  async getOrder(@Param('id', ParseUUIDPipe) id: string) {
    return this.orderService.getOrderWithPayment(id);
  }

  /** GET /dashboard/stats */
  @Get('dashboard/stats')
  async getDashboardStats() {
    return this.orderService.getDashboardStats();
  }
}

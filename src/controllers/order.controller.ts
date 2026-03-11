import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UsePipes,
  ValidationPipe,
  Logger,
} from '@nestjs/common';
import { OrderService } from '../services/order.service';
import { CreateOrderDto } from '../dto/create-order.dto';

@Controller('orders')
export class OrderController {
  private readonly logger = new Logger(OrderController.name);

  constructor(private readonly orderService: OrderService) {}

  /**
   * POST /orders
   * Cria um novo pedido e retorna os dados de pagamento
   */
  @Post()
  @UsePipes(new ValidationPipe({ 
    whitelist: true, 
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: true }
  }))
  async createOrder(@Body() dto: CreateOrderDto) {
    this.logger.log(`Recebido: ${JSON.stringify(dto)}`);
    return this.orderService.createOrder(dto);
  }

  /**
   * GET /orders/:id
   * Consulta status de um pedido
   */
  @Get(':id')
  async getOrder(@Param('id') id: string) {
    return this.orderService.getOrder(id);
  }
}

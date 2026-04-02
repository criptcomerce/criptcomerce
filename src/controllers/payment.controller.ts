import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { PaymentRepository } from '../repositories/payment.repository';

@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentRepo: PaymentRepository) {}

  @Get()
  async findAll() {
    return this.paymentRepo.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const payment = await this.paymentRepo.findById(id);
    if (!payment) throw new NotFoundException('Pagamento não encontrado');
    return payment;
  }
}
import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { NOWPaymentsClient, NOWPaymentsWebhookPayload } from '../gateways/nowpayments.client';
import { PaymentService } from '../services/payment.service';

@Controller('webhooks')
export class NOWPaymentsWebhookHandler {
  private readonly logger = new Logger(NOWPaymentsWebhookHandler.name);

  constructor(
    private readonly nowpayments: NOWPaymentsClient,
    private readonly paymentService: PaymentService,
  ) {}


  @Post('nowpayments')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Body() payload: NOWPaymentsWebhookPayload,
    @Headers('x-nowpayments-sig') signature: string,
  ): Promise<{ status: string }> {
    this.logger.log(`Webhook recebido | payment_id: ${payload.payment_id} | status: ${payload.payment_status}`);

    // 1) Valida assinatura HMAC
    const rawBody = JSON.stringify(payload);
    const isValid = this.nowpayments.validateWebhookSignature(rawBody, signature);

    if (!isValid) {
      this.logger.error('❌ Assinatura inválida no webhook NOWPayments');
      throw new BadRequestException('Invalid signature');
    }

    this.logger.log('✅ Assinatura válida');

    // 2) Processa o pagamento baseado no status
    try {
      await this.processPayment(payload);
      return { status: 'ok' };
    } catch (err) {
      this.logger.error(`Erro ao processar webhook: ${err.message}`, err.stack);
      // Retorna 200 mesmo com erro para evitar retry infinito
      return { status: 'error' };
    }
  }

  private async processPayment(payload: NOWPaymentsWebhookPayload): Promise<void> {
    const { payment_status, order_id, pay_amount, actually_paid, pay_currency } = payload;

    this.logger.log(`Processando pagamento | order: ${order_id} | status: ${payment_status}`);

    // Mapeamento de status NOWPayments
    switch (payment_status) {
      case 'finished':
      case 'confirmed':
        // Pagamento confirmado
        await this.paymentService.handlePaymentConfirmed({
          invoice_id: payload.payment_id.toString(),
          order_id: order_id,
          status: 'confirmed',
          amount_paid: actually_paid,
          currency: pay_currency,
          tx_hash: null,
        });
        break;

      case 'partially_paid':
        this.logger.warn(`Pagamento parcial | order: ${order_id} | pago: ${actually_paid} de ${pay_amount}`);
        // Você pode implementar lógica para pagamentos parciais
        break;

      case 'failed':
      case 'expired':
        this.logger.warn(`Pagamento falhou/expirou | order: ${order_id} | status: ${payment_status}`);
        await this.paymentService.handlePaymentFailed({
          invoice_id: payload.payment_id.toString(),
          order_id: order_id,
          reason: payment_status,
        });
        break;

      case 'waiting':
      case 'confirming':
      case 'sending':
        this.logger.log(`Status intermediário | order: ${order_id} | status: ${payment_status}`);
        break;

      default:
        this.logger.warn(`Status desconhecido: ${payment_status}`);
    }
  }
}

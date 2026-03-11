import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import * as crypto from 'crypto';
import { env } from '../config/env';

export interface NOWPaymentsInvoice {
  id: string;
  order_id: string;
  order_description: string;
  price_amount: string;
  price_currency: string;
  pay_currency: string;
  pay_amount: number;
  pay_address: string;
  created_at: string;
  updated_at: string;
  invoice_url: string;
  success_url: string;
  cancel_url: string;
  partially_paid_url: string;
  ipn_callback_url: string;
  is_fixed_rate: boolean;
  is_fee_paid_by_user: boolean;
}

export interface CreateInvoiceParams {
  price_amount: number;
  price_currency: string;         // USD
  pay_currency: string;           // BTC | ETH | USDT
  order_id: string;
  order_description?: string;
  ipn_callback_url: string;
  success_url?: string;
  cancel_url?: string;
}

export interface NOWPaymentsWebhookPayload {
  payment_id: number;
  payment_status: string;
  pay_address: string;
  price_amount: number;
  price_currency: string;
  pay_amount: number;
  actually_paid: number;
  pay_currency: string;
  order_id: string;
  order_description: string;
  purchase_id: string;
  outcome_amount: number;
  outcome_currency: string;
}

@Injectable()
export class NOWPaymentsClient {
  private readonly logger = new Logger(NOWPaymentsClient.name);
  private readonly http: AxiosInstance;

  constructor() {
    this.http = axios.create({
      baseURL: env.NOWPAYMENTS_API_URL,
      headers: {
        'x-api-key': env.NOWPAYMENTS_API_KEY,
        'Content-Type': 'application/json',
      },
      timeout: 15_000,
    });
  }

  /**
   * Cria uma invoice no NOWPayments
   */
  async createInvoice(params: CreateInvoiceParams): Promise<NOWPaymentsInvoice> {
    this.logger.log(`Criando invoice NOWPayments para order ${params.order_id}`);

    try {
      const { data } = await this.http.post<NOWPaymentsInvoice>('/v1/invoice', {
        price_amount: params.price_amount,
        price_currency: params.price_currency,
        pay_currency: params.pay_currency,
        order_id: params.order_id,
        order_description: params.order_description || `Pedido ${params.order_id}`,
        ipn_callback_url: params.ipn_callback_url,
        success_url: params.success_url,
        cancel_url: params.cancel_url,
        is_fixed_rate: false,
        is_fee_paid_by_user: true,
      });

      this.logger.log(`Invoice criada: ${data.id} | address: ${data.pay_address}`);
      return data;
    } catch (err) {
      this.logger.error('Erro ao criar invoice NOWPayments', {
        error: err?.response?.data || err.message,
        order_id: params.order_id,
      });
      throw new Error(`NOWPayments createInvoice falhou: ${err?.response?.data?.message || err.message}`);
    }
  }

  /**
   * Busca status de uma invoice
   */
  async getInvoice(invoiceId: string): Promise<NOWPaymentsInvoice> {
    try {
      const { data } = await this.http.get<NOWPaymentsInvoice>(`/v1/invoice/${invoiceId}`);
      return data;
    } catch (err) {
      this.logger.error(`Erro ao buscar invoice ${invoiceId}`, err?.response?.data || err.message);
      throw new Error(`Falha ao buscar invoice: ${err.message}`);
    }
  }

  /**
   * Busca status de um pagamento
   */
  async getPaymentStatus(paymentId: number): Promise<any> {
    try {
      const { data } = await this.http.get(`/v1/payment/${paymentId}`);
      return data;
    } catch (err) {
      this.logger.error(`Erro ao buscar pagamento ${paymentId}`, err?.response?.data || err.message);
      throw new Error(`Falha ao buscar pagamento: ${err.message}`);
    }
  }

  /**
   * Valida assinatura HMAC-SHA512 do webhook NOWPayments (IPN)
   */
  validateWebhookSignature(payload: string, signature: string): boolean {
    const expected = crypto
      .createHmac('sha512', env.NOWPAYMENTS_IPN_SECRET)
      .update(payload)
      .digest('hex');

    
    try {
      return crypto.timingSafeEqual(
        Buffer.from(expected),
        Buffer.from(signature),
      );
    } catch {
      return false;
    }
  }

  /**
   * Lista moedas disponíveis
   */
  async getAvailableCurrencies(): Promise<string[]> {
    try {
      const { data } = await this.http.get<{ currencies: string[] }>('/v1/currencies');
      return data.currencies;
    } catch (err) {
      this.logger.error('Erro ao buscar moedas disponíveis', err.message);
      return [];
    }
  }

  /**
   * Estima valor de pagamento
   */
  async estimatePrice(amount: number, currency_from: string, currency_to: string): Promise<number> {
    try {
      const { data } = await this.http.get('/v1/estimate', {
        params: {
          amount,
          currency_from,
          currency_to,
        },
      });
      return data.estimated_amount;
    } catch (err) {
      this.logger.error('Erro ao estimar preço', err.message);
      throw err;
    }
  }
}

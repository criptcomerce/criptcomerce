import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { TransferService } from '../services/transfer.service';

@Injectable()
export class TransferFundsJob {
  private readonly logger = new Logger(TransferFundsJob.name);

  constructor(private readonly transferService: TransferService) {}

  /**
   * Executa toda sexta-feira às 23:00.
   * Transfere saldo de todas as carteiras de pedidos pagos para a carteira central.
   */
  @Cron('0 23 * * 5', { name: 'transfer-funds-weekly' })
  async run(): Promise<void> {
    this.logger.log('🔄 TransferFundsJob iniciado (sweep semanal)');

    try {
      await this.transferService.executeSweep();
      this.logger.log('✅ TransferFundsJob concluído com sucesso');
    } catch (err) {
      this.logger.error('❌ Erro no TransferFundsJob', { error: err.message, stack: err.stack });
    }
  }
}

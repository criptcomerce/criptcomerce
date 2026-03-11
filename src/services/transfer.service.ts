import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentRepository } from '../repositories/payment.repository';
import { Transfer } from '../entities/transfer.entity';
import { env } from '../config/env';

@Injectable()
export class TransferService {
  private readonly logger = new Logger(TransferService.name);

  constructor(
    private readonly paymentRepo: PaymentRepository,
    @InjectRepository(Transfer)
    private readonly transferRepo: Repository<Transfer>,
  ) {}

  /**
   * Executa a varredura semanal (sweep).
   * Agrupa pagamentos por moeda e transfere para a carteira central.
   *
   * NOTA: A lógica real de transferência blockchain deve ser implementada
   * conforme sua integração (ex: CoinGate Withdrawals API, ethers.js para ERC20, etc.)
   */
  async executeSweep(): Promise<void> {
    this.logger.log('🔄 Iniciando sweep semanal...');

    const currencies = ['BTC', 'ETH', 'USDT'];

    for (const currency of currencies) {
      await this.sweepCurrency(currency);
    }

    this.logger.log('✅ Sweep semanal concluído');
  }

  private async sweepCurrency(currency: string): Promise<void> {
    const payments = await this.paymentRepo.findPaidWithAddresses(currency);

    if (payments.length === 0) {
      this.logger.log(`Nenhum pagamento pendente de sweep para ${currency}`);
      return;
    }

    const centralWallet = this.getCentralWallet(currency);
    const totalAmount = payments.reduce((sum, p) => sum + Number(p.payment_amount), 0);

    this.logger.log(`Sweep ${currency}: ${payments.length} pagamentos | Total: ${totalAmount} | Destino: ${centralWallet}`);

    // -----------------------------------------------------------------------
    // IMPLEMENTAR: lógica real de transferência blockchain aqui
    // Opções:
    // - CoinGate Withdrawal API
    // - ethers.js para ERC20 (USDT)
    // - bitcoin-js para BTC
    // -----------------------------------------------------------------------
    const txHash = await this.executeBlockchainTransfer(
      currency,
      totalAmount,
      centralWallet,
      payments.map((p) => p.payment_address),
    );

    // Registra a transferência no banco
    await this.transferRepo.save({
      currency,
      amount: totalAmount,
      tx_hash: txHash,
      executed_at: new Date(),
    });

    this.logger.log(`✅ Sweep ${currency} concluído | tx_hash: ${txHash}`);
  }

  /**
   * Stub para implementação real de transferência blockchain.
   * Substitua com a lógica correta para cada moeda.
   */
  private async executeBlockchainTransfer(
    currency: string,
    amount: number,
    destination: string,
    sourceAddresses: string[],
  ): Promise<string> {
    // TODO: Implementar transferência real
    // Exemplo ERC20 (USDT via ethers.js):
    //   const provider = new ethers.JsonRpcProvider(RPC_URL);
    //   const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    //   const contract = new ethers.Contract(USDT_CONTRACT, ERC20_ABI, wallet);
    //   const tx = await contract.transfer(destination, amount);
    //   return tx.hash;

    this.logger.warn(`[STUB] Transferência blockchain não implementada para ${currency}`);
    return `stub-tx-${Date.now()}`;
  }

  private getCentralWallet(currency: string): string {
    const wallets: Record<string, string> = {
      BTC: env.CENTRAL_BTC_WALLET,
      ETH: env.CENTRAL_ETH_WALLET,
      USDT: env.CENTRAL_USDT_WALLET,
    };
    const wallet = wallets[currency];
    if (!wallet) throw new Error(`Carteira central não configurada para ${currency}`);
    return wallet;
  }
}

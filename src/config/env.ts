import * as dotenv from 'dotenv';
dotenv.config();

export const env = {
  // NOWPayments
  NOWPAYMENTS_API_KEY: process.env.NOWPAYMENTS_API_KEY || '',
  NOWPAYMENTS_IPN_SECRET: process.env.NOWPAYMENTS_IPN_SECRET || '',
  NOWPAYMENTS_API_URL: process.env.NOWPAYMENTS_API_URL || 'https://api.nowpayments.io',

  // Wallets centrais
  CENTRAL_BTC_WALLET: process.env.CENTRAL_BTC_WALLET || '',
  CENTRAL_ETH_WALLET: process.env.CENTRAL_ETH_WALLET || '',
  CENTRAL_USDT_WALLET: process.env.CENTRAL_USDT_WALLET || '',

  // Banco
  DATABASE_URL: process.env.DATABASE_URL || '',

  BASE_URL: process.env.BASE_URL || 'http://localhost:3000',
  NODE_ENV: process.env.NODE_ENV || 'development',
};

// Validação de variáveis obrigatórias em produção
export function validateEnv(): void {
  const required = [
    'NOWPAYMENTS_API_KEY',
    'NOWPAYMENTS_IPN_SECRET',
    'CENTRAL_BTC_WALLET',
    'CENTRAL_ETH_WALLET',
    'CENTRAL_USDT_WALLET',
    'DATABASE_URL',
  ];

  if (env.NODE_ENV === 'production') {
    const missing = required.filter((key) => !env[key]);
    if (missing.length > 0) {
      throw new Error(`Variáveis de ambiente obrigatórias não definidas: ${missing.join(', ')}`);
    }
  }
}

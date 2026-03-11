import {
  Module,
  NestModule,
  MiddlewareConsumer,
  RequestMethod,
} from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';

import { databaseConfig } from './config/database';

import { Order } from './entities/order.entity';
import { Payment } from './entities/payment.entity';
import { Transfer } from './entities/transfer.entity';

import { OrderRepository } from './repositories/order.repository';
import { PaymentRepository } from './repositories/payment.repository';

import { OrderService } from './services/order.service';
import { PaymentService } from './services/payment.service';
import { TransferService } from './services/transfer.service';

// import { CoinGateClient } from './gateways/coingate.client';
import { NOWPaymentsClient } from './gateways/nowpayments.client';

import { OrderController } from './controllers/order.controller';
// import { CoinGateWebhookHandler } from './webhooks/coingate-webhook.handler';
import { NOWPaymentsWebhookHandler } from './webhooks/nowpayments-webhook.handler';

import { ExpireOrdersJob } from './jobs/expire-orders.job';
import { TransferFundsJob } from './jobs/transfer-funds.job';
import { ReconciliationWorker } from './jobs/reconciliation.worker';

import { RawBodyMiddleware } from './middleware/raw-body.middleware';

@Module({
  imports: [
    TypeOrmModule.forRoot(databaseConfig),
    TypeOrmModule.forFeature([Order, Payment, Transfer]),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,   
        limit: 10,     
      },
    ]),
  ],
  controllers: [
    OrderController,
    NOWPaymentsWebhookHandler,
  ],
  providers: [
    // Guard global de rate limit (aplica ThrottlerModule a todas as rotas)
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    // Repositories
    OrderRepository,
    PaymentRepository,
    // Services
    OrderService,
    PaymentService,
    TransferService,
    // Gateway
    NOWPaymentsClient,
    // Jobs
    ExpireOrdersJob,
    TransferFundsJob,
    ReconciliationWorker,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(RawBodyMiddleware)
      .forRoutes({ path: 'webhooks/nowpayments', method: RequestMethod.POST });
  }
}

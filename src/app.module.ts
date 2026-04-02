import {
  Module,
  NestModule,
  MiddlewareConsumer,
  RequestMethod,
} from '@nestjs/common';
import { APP_GUARD }                       from '@nestjs/core';
import { TypeOrmModule }                   from '@nestjs/typeorm';
import { ScheduleModule }                  from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { JwtModule }                       from '@nestjs/jwt';
import { PassportModule }                  from '@nestjs/passport';

import { databaseConfig } from './config/database';

// Entities
import { Order }    from './entities/order.entity';
import { Payment }  from './entities/payment.entity';
import { Transfer } from './entities/transfer.entity';
import { User }     from './entities/user.entity';
import { Product }  from './entities/product.entity';

// Repositories
import { OrderRepository }   from './repositories/order.repository';
import { PaymentRepository } from './repositories/payment.repository';
import { UserRepository }    from './repositories/user.repository';
import { ProductRepository } from './repositories/product.repository';

// Services
import { OrderService }   from './services/order.service';
import { PaymentService } from './services/payment.service';
import { TransferService }from './services/transfer.service';
import { UserService }    from './services/user.service';
import { AuthService }    from './services/auth.service';
import { ProductService } from './services/product.service';

// Controllers
import { OrderController } from './controllers/order.controller';
import { AuthController }  from './controllers/auth.controller';

// Auth
import { JwtStrategy } from './auth/jwt.strategy';
import { RolesGuard }  from './auth/roles.guard';

// Gateway
import { NOWPaymentsClient }        from './gateways/nowpayments.client';
import { NOWPaymentsWebhookHandler }from './webhooks/nowpayments-webhook.handler';

// Jobs
import { ExpireOrdersJob }      from './jobs/expire-orders.job';
import { TransferFundsJob }     from './jobs/transfer-funds.job';
import { ReconciliationWorker } from './jobs/reconciliation.worker';

// Middleware
import { RawBodyMiddleware } from './middleware/raw-body.middleware';
import { ProductController } from './controllers/product.controller';
import { PaymentController } from './controllers/payment.controller';

@Module({
  imports: [
    TypeOrmModule.forRoot(databaseConfig),
    TypeOrmModule.forFeature([Order, Payment, Transfer, User, Product]),
    ScheduleModule.forRoot(),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret:      process.env.JWT_SECRET || 'dev-secret-change-in-production',
      signOptions: { expiresIn: '1d' },
    }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 10 }]),
  ],
  controllers: [
    AuthController,
    OrderController,
    PaymentController,    // ← confirme que está aqui
    ProductController,
    NOWPaymentsWebhookHandler
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    // Repositories
    OrderRepository,
    PaymentRepository,
    UserRepository,
    ProductRepository,
    // Services
    OrderService,
    PaymentService,
    TransferService,
    UserService,
    AuthService,
    ProductService,
    // Auth
    JwtStrategy,
    RolesGuard,
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

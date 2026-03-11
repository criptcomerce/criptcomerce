import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { env } from './env';

export const databaseConfig: TypeOrmModuleOptions = {
  type: 'postgres',
  url: env.DATABASE_URL,
  entities: [__dirname + '/../entities/*.entity{.ts,.js}'],
  synchronize: env.NODE_ENV !== 'production', // Em produção use migrations
  logging: env.NODE_ENV === 'development',
  ssl: env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  uuidExtension: 'uuid-ossp'
};

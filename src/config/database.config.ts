import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

export const databaseConfig: TypeOrmModuleOptions = {
  url: process.env.DATABASE_URL,
  type: 'postgres',
  ssl: {
    rejectUnauthorized: false, // Important for connecting to Neon from Heroku
  },
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  synchronize: process.env.NODE_ENV !== 'production', // Be careful with this in production
  logging: process.env.NODE_ENV !== 'production',
};

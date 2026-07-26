import { registerAs } from '@nestjs/config';

export interface AppConfig {
  port: number;
  env: string;
  corsOrigins: string[];
}

export default registerAs(
  'app',
  (): AppConfig => ({
    port: parseInt(process.env.PORT ?? '8080', 10),
    env: process.env.NODE_ENV ?? 'development',
    corsOrigins: (process.env.CORS_ORIGINS ?? '')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
  }),
);

import { registerAs } from '@nestjs/config';

export interface AppConfig {
  port: number;
  env: string;
  corsOrigins: string[];
  swaggerEnabled: boolean;
}

export default registerAs('app', (): AppConfig => {
  const env = process.env.NODE_ENV ?? 'development';

  return {
    port: parseInt(process.env.PORT ?? '8080', 10),
    env,
    corsOrigins: (process.env.CORS_ORIGINS ?? '')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
    // Swagger publishes the whole API surface — every route, every DTO field —
    // and it is the only HTML this service serves. Outside development that is
    // a map handed out for free, so the UI and the `/api-json` document are
    // mounted only when this is true. Keeping it off in production is also what
    // lets `@fastify/static` stay a devDependency: the adapter only loads that
    // package when `useStaticAssets()` runs, which is Swagger and nothing else.
    swaggerEnabled: env !== 'production',
  };
});

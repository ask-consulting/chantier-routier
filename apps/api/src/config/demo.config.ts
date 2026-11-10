import { registerAs } from '@nestjs/config';

export interface DemoConfig {
  /**
   * Keeps the public demonstration up: the « Chantia Démo » organization,
   * written again every day, and `POST /auth/demo` to open a session on it.
   * Off unless `DEMO_ENABLED=true`: a deployment does not grow a demo by surprise.
   */
  enabled: boolean;
}

export default registerAs('demo', (): DemoConfig => ({
  enabled: process.env.DEMO_ENABLED === 'true',
}));

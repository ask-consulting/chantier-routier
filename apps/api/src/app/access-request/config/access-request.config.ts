import { registerAs } from '@nestjs/config';

export interface AccessRequestConfig {
  /** Who is told that a company asked for access. */
  notifyEmail: string;
  /**
   * How many announcements may leave in 24 hours.
   *
   * The form is public, and the mail quota is shared with invitations: a flood
   * of requests must not be what stops an invitation from going out. Requests
   * past the limit are still stored.
   */
  dailyEmailLimit: number;
}

const DEFAULT_DAILY_EMAIL_LIMIT = 50;

export default registerAs('accessRequest', (): AccessRequestConfig => {
  const limit = parseInt(process.env.ACCESS_REQUEST_DAILY_EMAIL_LIMIT ?? '', 10);
  return {
    notifyEmail: process.env.ACCESS_REQUEST_NOTIFY_EMAIL ?? 'contact@chantia.tn',
    dailyEmailLimit: Number.isFinite(limit) && limit > 0 ? limit : DEFAULT_DAILY_EMAIL_LIMIT,
  };
});

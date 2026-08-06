/** Trades a valid refresh token for a new session, rotating the token. */
export class RefreshSessionCommand {
  constructor(
    public readonly refreshToken: string,
    public readonly userAgent: string | null,
  ) {}
}

export class LogoutCommand {
  constructor(
    public readonly userId: string,
    /**
     * The session to end. Omitted means "log me out everywhere" — the useful
     * behaviour when a device has been lost and its token cannot be presented.
     */
    public readonly refreshToken: string | null,
  ) {}
}

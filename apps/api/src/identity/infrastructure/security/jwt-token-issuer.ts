import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes } from 'node:crypto';
import { IAccessTokenClaims } from '@chantia/shared';
import { IdentityConfig } from '../../config/identity.config';
import {
  IssuedAccessToken,
  IssuedRefreshToken,
  TokenIssuerPort,
} from '../../domain/ports/token-issuer.port';

/** 48 bytes of entropy — far beyond guessing range, still a short URL-safe string. */
const REFRESH_TOKEN_BYTES = 48;

/**
 * Mints the two halves of a session.
 *
 * Access token: a signed JWT. It carries the tenant and the role, so the
 * business API can authorize without ever querying the identity tables.
 *
 * Refresh token: an opaque random string, *not* a JWT. Nothing is encoded in it,
 * so it can only be validated against the database — which is precisely what
 * makes revocation and rotation possible. Only its SHA-256 is stored: a database
 * leak yields nothing replayable. Plain SHA-256 (no salt, no stretching) is
 * enough here and deliberately fast — unlike a password, the input already has
 * 384 bits of entropy, so there is nothing to brute-force.
 */
@Injectable()
export class JwtTokenIssuer implements TokenIssuerPort {
  private readonly config: IdentityConfig;

  constructor(
    private readonly jwtService: JwtService,
    configService: ConfigService,
  ) {
    this.config = configService.getOrThrow<IdentityConfig>('identity');
  }

  async issueAccessToken(claims: IAccessTokenClaims): Promise<IssuedAccessToken> {
    const token = await this.jwtService.signAsync(claims, {
      secret: this.config.accessTokenSecret,
      issuer: this.config.issuer,
      expiresIn: this.config.accessTokenTtl,
      algorithm: 'HS256',
    });

    return { token, expiresIn: this.config.accessTokenTtl };
  }

  issueRefreshToken(): IssuedRefreshToken {
    const token = randomBytes(REFRESH_TOKEN_BYTES).toString('base64url');

    return {
      token,
      tokenHash: this.hashRefreshToken(token),
      expiresAt: new Date(Date.now() + this.config.refreshTokenTtl * 1000),
    };
  }

  hashRefreshToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}

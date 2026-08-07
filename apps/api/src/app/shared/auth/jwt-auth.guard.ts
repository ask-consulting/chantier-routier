import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { IAccessTokenClaims } from '@chantia/shared';
import { AuthConfig } from '@config/auth.config';
import { TenantContext } from '../tenant/tenant-context';
import { AUTH_USER_KEY, RequestWithUser } from './authenticated-user';
import { IS_PUBLIC_KEY } from './public.decorator';

/**
 * Verifies the bearer access token and resolves the caller.
 *
 * Stateless on purpose: no database lookup. That is what makes the identity
 * context extractable — this guard keeps working unchanged when tokens start
 * coming from a remote service, as long as the signing secret matches.
 *
 * The trade-off is that a revoked or demoted account stays valid until its
 * access token expires (15 min by default). Refresh tokens *are* checked against
 * the database, so the blast radius is one access-token lifetime.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly authConfig: AuthConfig;

  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    private readonly tenantContext: TenantContext,
    configService: ConfigService,
  ) {
    this.authConfig = configService.getOrThrow<AuthConfig>('auth');
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const token = extractBearerToken(request.headers.authorization);
    if (!token) {
      throw new UnauthorizedException('Missing bearer access token');
    }

    let claims: IAccessTokenClaims;
    try {
      claims = await this.jwtService.verifyAsync<IAccessTokenClaims>(token, {
        secret: this.authConfig.accessTokenSecret,
        issuer: this.authConfig.issuer,
      });
    } catch {
      // Deliberately opaque: distinguishing "expired" from "malformed" only
      // helps an attacker probe the signing setup.
      throw new UnauthorizedException('Invalid or expired access token');
    }

    request[AUTH_USER_KEY] = {
      id: claims.sub,
      organizationId: claims.org,
      role: claims.role,
      email: claims.email,
    };

    // Publishes the tenant for the rest of the request, so the Prisma extension
    // can scope every query without each handler passing it down. `@Public()`
    // routes return before this point and stay deliberately un-scoped.
    this.tenantContext.set(claims.org);
    return true;
  }
}

function extractBearerToken(header: string | string[] | undefined): string | null {
  const value = Array.isArray(header) ? header[0] : header;
  if (!value) {
    return null;
  }
  const [scheme, token] = value.split(' ');
  return scheme?.toLowerCase() === 'bearer' && token ? token : null;
}

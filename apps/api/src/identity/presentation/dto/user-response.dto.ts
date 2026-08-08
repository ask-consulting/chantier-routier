import { ApiProperty } from '@nestjs/swagger';
import { IUser, Locale, Permission, UserRole, permissionsForRole } from '@chantia/shared';
import { User } from '../../domain/entities/user.entity';

/**
 * A user as the outside world sees it. `passwordHash` has no field here, so it
 * cannot leak by accident — the mapping is explicit, never a spread of the
 * entity.
 */
export class UserResponseDto implements IUser {
  @ApiProperty() id: string;
  @ApiProperty() organizationId: string;
  @ApiProperty() email: string;
  @ApiProperty() firstName: string;
  @ApiProperty() lastName: string;
  @ApiProperty({ enum: UserRole }) role: UserRole;
  @ApiProperty() active: boolean;
  @ApiProperty({ nullable: true }) workerId: string | null;
  @ApiProperty({ enum: Locale }) locale: Locale;
  @ApiProperty({ description: 'False while the invitation is still outstanding' })
  hasPassword: boolean;
  @ApiProperty({ nullable: true }) lastLoginAt: string | null;
  @ApiProperty({ required: false }) createdAt?: string;
  @ApiProperty({ required: false }) updatedAt?: string;

  static fromDomain(user: User): UserResponseDto {
    const dto = new UserResponseDto();
    dto.id = user.id;
    dto.organizationId = user.organizationId;
    dto.email = user.email;
    dto.firstName = user.firstName;
    dto.lastName = user.lastName;
    dto.role = user.role;
    dto.active = user.active;
    dto.workerId = user.workerId;
    dto.locale = user.locale;
    dto.hasPassword = user.hasPassword();
    dto.lastLoginAt = user.lastLoginAt?.toISOString() ?? null;
    dto.createdAt = user.createdAt?.toISOString();
    dto.updatedAt = user.updatedAt?.toISOString();
    return dto;
  }
}

/**
 * The caller's own profile, with the capabilities their role carries.
 *
 * Sent on `/auth/me` so a client can grey out what it must not offer without
 * re-implementing the matrix. It is a *convenience*, not a security boundary —
 * the API re-checks every call regardless of what the client believes.
 */
export class CurrentUserResponseDto extends UserResponseDto {
  @ApiProperty({ enum: Permission, isArray: true })
  permissions: Permission[];

  static fromDomain(user: User): CurrentUserResponseDto {
    const dto = Object.assign(new CurrentUserResponseDto(), UserResponseDto.fromDomain(user));
    dto.permissions = [...permissionsForRole(user.role)];
    return dto;
  }
}

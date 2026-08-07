import { describe, expect, it } from 'vitest';
import { Permission } from '../enums/permission.enums';
import { UserRole } from '../enums/user.enums';
import {
  ROLE_PERMISSIONS,
  permissionsForRole,
  roleHasEveryPermission,
  roleHasPermission,
} from './role-permissions';

describe('ROLE_PERMISSIONS', () => {
  it('covers every role', () => {
    for (const role of Object.values(UserRole)) {
      expect(permissionsForRole(role).length).toBeGreaterThan(0);
    }
  });

  it('grants the admin every declared permission', () => {
    expect([...ROLE_PERMISSIONS[UserRole.ADMIN]].sort()).toEqual(
      [...Object.values(Permission)].sort(),
    );
  });

  it('lists no permission twice', () => {
    for (const role of Object.values(UserRole)) {
      const granted = permissionsForRole(role);
      expect(new Set(granted).size).toBe(granted.length);
    }
  });

  it('keeps account management to the admin alone', () => {
    for (const role of Object.values(UserRole)) {
      expect(roleHasPermission(role, Permission.USER_MANAGE)).toBe(role === UserRole.ADMIN);
    }
  });

  it('hides money from the field roles', () => {
    expect(roleHasPermission(UserRole.FOREMAN, Permission.BUDGET_READ)).toBe(false);
    expect(roleHasPermission(UserRole.WORKER, Permission.BUDGET_READ)).toBe(false);
    expect(roleHasPermission(UserRole.SITE_MANAGER, Permission.BUDGET_READ)).toBe(true);
  });

  it('lets every role read the worksites it works on', () => {
    for (const role of Object.values(UserRole)) {
      expect(roleHasPermission(role, Permission.WORKSITE_READ)).toBe(true);
    }
  });
});

describe('roleHasEveryPermission', () => {
  it('requires all of the listed permissions', () => {
    expect(
      roleHasEveryPermission(UserRole.FOREMAN, [
        Permission.TIMESHEET_READ,
        Permission.TIMESHEET_RECORD,
      ]),
    ).toBe(true);

    expect(
      roleHasEveryPermission(UserRole.FOREMAN, [
        Permission.TIMESHEET_READ,
        Permission.EXPENSE_MANAGE,
      ]),
    ).toBe(false);
  });

  it('is satisfied by an empty requirement', () => {
    expect(roleHasEveryPermission(UserRole.WORKER, [])).toBe(true);
  });
});

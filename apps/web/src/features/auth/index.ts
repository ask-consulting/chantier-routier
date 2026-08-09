/**
 * The authentication feature's public surface.
 *
 * `api/auth.api.ts` and the session context's internals stay private. What a
 * route or another feature is allowed to know is here: who is signed in, what
 * they may do, and the three screens that get them there.
 */

export { SessionProvider, useSession } from './model/session-provider';
export { useEveryPermission, usePermission, usePermissions } from './model/use-permissions';

export { Can } from './ui/can';
export { RequireSession } from './ui/require-session';
export { UserMenu } from './ui/user-menu';
export { LoginForm } from './ui/login-form';
export { InvitationForm } from './ui/invitation-form';

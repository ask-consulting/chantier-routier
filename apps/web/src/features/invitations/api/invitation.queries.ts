'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  cancelInvitation,
  createInvitation,
  fetchInvitations,
  resendInvitation,
  type InvitationListParams,
} from './invitation.api';
import { invitationKeys } from './invitation.keys';

/**
 * The React-facing side of the invitation endpoints.
 *
 * **Every write goes through a mutation defined here, and that mutation owns its
 * invalidation.** Both of them touch the list — a resend moves the deadline, a
 * cancellation moves the status — so both invalidate `invitationKeys.all`. The
 * moment a component calls `invitation.api` directly, one write forgets to
 * refresh and the screen shows a state that no longer exists.
 *
 * `placeholderData` keeps the previous page on screen while a filter is applied,
 * so typing a name does not blink the table away between keystrokes.
 */

export function useInvitations(params?: InvitationListParams) {
  return useQuery({
    queryKey: invitationKeys.list(params),
    queryFn: () => fetchInvitations(params),
    placeholderData: (previous) => previous,
  });
}

export function useCreateInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createInvitation,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: invitationKeys.all }),
  });
}

export function useResendInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: resendInvitation,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: invitationKeys.all }),
  });
}

export function useCancelInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: cancelInvitation,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: invitationKeys.all }),
  });
}

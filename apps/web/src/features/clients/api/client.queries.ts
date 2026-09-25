'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { IUpdateClient } from '@chantia/shared';
import {
  createClient,
  deleteClient,
  fetchClients,
  updateClient,
  type ClientListParams,
} from './client.api';
import { clientKeys } from './client.keys';

/**
 * The React-facing side of the client endpoints. Every write owns its
 * invalidation, like the other features.
 *
 * An edit also invalidates `['worksites']`: a worksite shows its client's
 * name, and renaming a client must not leave the worksite list quoting the
 * old one until the next reload. The literal rather than `worksiteKeys` —
 * a feature does not reach into another's private files.
 */

const WORKSITES_KEY = ['worksites'] as const;

export function useClients(params?: ClientListParams) {
  return useQuery({
    queryKey: clientKeys.list(params),
    queryFn: () => fetchClients(params),
    placeholderData: (previous) => previous,
  });
}

/** Every client, for a picker. Same cache as any other list, keyed apart. */
export function useClientOptions() {
  return useClients({ paginated: false });
}

export function useCreateClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createClient,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: clientKeys.all }),
  });
}

export function useUpdateClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: IUpdateClient }) => updateClient(id, data),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: clientKeys.all }),
        queryClient.invalidateQueries({ queryKey: WORKSITES_KEY }),
      ]),
  });
}

export function useDeleteClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteClient,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: clientKeys.all }),
  });
}

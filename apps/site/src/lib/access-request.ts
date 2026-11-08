export interface AccessRequest {
  company: string;
  phone: string;
  kind: string;
  locale: string;
  /** Hidden from people; a bot that fills it gives itself away. */
  website: string;
}

export const isComplete = (request: Pick<AccessRequest, 'company' | 'phone'>): boolean =>
  request.company.trim() !== '' && request.phone.trim() !== '';

/** Sends the request. Throws on any failure: the form must never claim success. */
export async function submitAccessRequest(
  apiUrl: string,
  request: AccessRequest,
  send: typeof fetch = fetch,
): Promise<void> {
  if (!apiUrl) throw new Error('NEXT_PUBLIC_API_URL is not set');
  const response = await send(`${apiUrl}/access-requests`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(request),
  });
  if (!response.ok) throw new Error(`Access request refused: ${response.status}`);
}

import { describe, expect, it, vi } from 'vitest';
import { isComplete, submitAccessRequest } from './access-request';

const request = { company: 'Société', phone: '+216', kind: 'bat', locale: 'fr', website: '' };

describe('isComplete', () => {
  it('needs a company and a phone, spaces do not count', () => {
    expect(isComplete({ company: 'A', phone: '1' })).toBe(true);
    expect(isComplete({ company: '  ', phone: '1' })).toBe(false);
    expect(isComplete({ company: 'A', phone: '' })).toBe(false);
  });
});

describe('submitAccessRequest', () => {
  it('posts the request to the API', async () => {
    const send = vi.fn(async () => new Response(null, { status: 201 }));
    await submitAccessRequest('https://api.test', request, send as unknown as typeof fetch);
    expect(send).toHaveBeenCalledWith(
      'https://api.test/access-requests',
      expect.objectContaining({ method: 'POST', body: JSON.stringify(request) }),
    );
  });

  it('fails when the API refuses', async () => {
    const send = vi.fn(async () => new Response(null, { status: 500 }));
    await expect(
      submitAccessRequest('https://api.test', request, send as unknown as typeof fetch),
    ).rejects.toThrow('500');
  });

  it('fails rather than pretending when no API is configured', async () => {
    await expect(submitAccessRequest('', request)).rejects.toThrow('NEXT_PUBLIC_API_URL');
  });
});

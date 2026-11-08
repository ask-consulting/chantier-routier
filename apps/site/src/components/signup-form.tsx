'use client';

import { type FormEvent, useState } from 'react';
import type { Copy, Lang } from '@/content/copy';
import { isComplete, submitAccessRequest } from '@/lib/access-request';
import { config } from '@/lib/config';

const KIND_IDS = ['building', 'roads', 'networks', 'earthworks', 'other'];
type Status = 'idle' | 'incomplete' | 'sending' | 'sent' | 'failed';

export function SignupForm({ t, lang }: { t: Copy; lang: Lang }) {
  const [kind, setKind] = useState(KIND_IDS[0]);
  const [company, setCompany] = useState('');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [status, setStatus] = useState<Status>('idle');

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!isComplete({ company, phone })) {
      setStatus('incomplete');
      return;
    }
    setStatus('sending');
    try {
      await submitAccessRequest(config.apiUrl, { company, phone, kind, locale: lang, website });
      setStatus('sent');
    } catch {
      setStatus('failed');
    }
  }

  if (status === 'sent') {
    return (
      <div className="thanks" role="status">
        <strong className="display">{t.thanks}</strong>
        <p>{t.thanksText}</p>
      </div>
    );
  }

  return (
    <form className="form" onSubmit={onSubmit} noValidate>
      <div className="field-group">
        <span>{t.kind}</span>
        <div className="chips">
          {KIND_IDS.map((id, index) => (
            <button
              key={id}
              type="button"
              className="chip"
              aria-pressed={kind === id}
              onClick={() => setKind(id)}
            >
              {t.kinds[index]}
            </button>
          ))}
        </div>
      </div>
      <div className="field-group">
        <label htmlFor="company">{t.company}</label>
        <input
          id="company"
          className="field"
          autoComplete="organization"
          value={company}
          onChange={(event) => setCompany(event.target.value)}
        />
      </div>
      <div className="field-group">
        <label htmlFor="phone">{t.phone}</label>
        <input
          id="phone"
          className="field"
          type="tel"
          dir="ltr"
          autoComplete="tel"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
        />
      </div>
      <input
        className="honeypot"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        name="website"
        value={website}
        onChange={(event) => setWebsite(event.target.value)}
      />
      {status === 'incomplete' && <p className="error">{t.required}</p>}
      {status === 'failed' && (
        <p className="error" role="alert">
          {t.sendError}
        </p>
      )}
      <button type="submit" className="btn btn-yellow" disabled={status === 'sending'}>
        {status === 'sending' ? t.sending : t.signup}
      </button>
    </form>
  );
}

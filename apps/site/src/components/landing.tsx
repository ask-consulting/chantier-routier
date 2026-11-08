'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { copy, type Lang } from '@/content/copy';
import { config } from '@/lib/config';
import { Demo } from './demo';
import { SignupForm } from './signup-form';

const LANGS: { id: Lang; label: string; html: string }[] = [
  { id: 'ar', label: 'تونسي', html: 'aeb' },
  { id: 'la', label: 'Tounsi', html: 'aeb-Latn' },
  { id: 'fr', label: 'Français', html: 'fr' },
];
const STORAGE_KEY = 'chantia-lang';

function StoreBadge({ name, url, soon }: { name: string; url: string; soon: string }) {
  const body = (
    <>
      <svg aria-hidden="true" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#ffc627" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3v12" />
        <path d="m7 10 5 5 5-5" />
        <path d="M4 20h16" />
      </svg>
      <span>
        {!url && <small>{soon}</small>}
        <strong dir="ltr">{name}</strong>
      </span>
    </>
  );
  return url ? (
    <a className="store" href={url}>
      {body}
    </a>
  ) : (
    <span className="store">{body}</span>
  );
}

export function Landing() {
  const [lang, setLang] = useState<Lang>('ar');
  const t = copy[lang];

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'ar' || saved === 'la' || saved === 'fr') setLang(saved);
    } catch {
      // Private browsing: the page simply opens in its default language.
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = LANGS.find((item) => item.id === lang)?.html ?? 'aeb';
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }, [lang]);

  function chooseLang(next: Lang) {
    setLang(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Nothing to do: the choice just will not survive a reload.
    }
  }

  const contacts = [
    config.whatsapp && { label: 'WhatsApp', href: `https://wa.me/${config.whatsapp}`, text: `+${config.whatsapp}` },
    config.email && { label: 'Email', href: `mailto:${config.email}`, text: config.email },
  ].filter((item): item is { label: string; href: string; text: string } => Boolean(item));

  return (
    <div id="top">
      <header className="wrap header">
        <a className="brand" href="#top">
          <Image src="/logo.svg" alt="" width={42} height={42} />
          <span>Chantia</span>
        </a>
        <div className="nav">
          <div className="langs" role="group" aria-label="Langue">
            {LANGS.map((item) => (
              <button
                key={item.id}
                type="button"
                className="lang"
                aria-pressed={lang === item.id}
                onClick={() => chooseLang(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
          {config.appUrl && (
            <a className="nav-link" href={config.appUrl}>
              {t.login}
            </a>
          )}
          <a className="btn btn-yellow btn-small" href="#signup">
            {t.signup}
          </a>
        </div>
      </header>

      <main>
        <section className="wrap hero">
          <h1 className="display">{t.title}</h1>
          <div className="hero-row">
            <div className="hero-text">
              <p className="lead">{t.sub}</p>
              <p className="notice">{t.building}</p>
            </div>
            <div className="actions">
              <a className="btn btn-yellow" href="#signup">
                {t.signup}
              </a>
              <a className="btn btn-ghost" href="#mobile">
                {t.getApp}
              </a>
            </div>
          </div>
        </section>

        <section className="wrap">
          <Demo t={t} />
        </section>

        <section className="modules">
          <div className="wrap">
            <h2 className="display">{t.allTitle}</h2>
            <div className="cards">
              {t.cards.map(([title, text]) => (
                <article className="card" key={title}>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="ai">
          <div className="wrap">
            <div>
              <span className="tag">{t.nextTag}</span>
              <h2 className="display">{t.aiTitle}</h2>
            </div>
            <p className="lead">{t.aiText}</p>
          </div>
        </section>

        <section className="mobile" id="mobile">
          <div className="wrap">
            <div className="mobile-text">
              <h2 className="display">{t.appTitle}</h2>
              <p>{t.appText}</p>
            </div>
            <div className="actions">
              <StoreBadge name="App Store" url={config.appStoreUrl} soon={t.soon} />
              <StoreBadge name="Google Play" url={config.googlePlayUrl} soon={t.soon} />
            </div>
          </div>
        </section>

        <section className="wrap signup" id="signup">
          <div className="signup-text">
            <h2 className="display">{t.signTitle}</h2>
            <p className="lead">{t.signText}</p>
            {contacts.map((contact) => (
              <p key={contact.label}>
                {contact.label} : <a href={contact.href}>{contact.text}</a>
              </p>
            ))}
          </div>
          <SignupForm t={t} lang={lang} />
        </section>
      </main>

      <footer className="wrap footer">
        <span>Chantia · chantia.tn</span>
      </footer>
    </div>
  );
}

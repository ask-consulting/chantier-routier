import { NotificationChannel, NotificationLocale, NotificationSubject } from '../notification.types';

/** A placeholder left unfilled, named so the caller knows which. */
export class MissingPlaceholdersError extends Error {
  constructor(readonly placeholders: readonly string[]) {
    super(`Template placeholders were not supplied: ${placeholders.join(', ')}`);
    this.name = 'MissingPlaceholdersError';
  }
}

const PLACEHOLDER = /\{\{\s*([a-zA-Z][a-zA-Z0-9]*)\s*\}\}/g;

/**
 * The text of one notification, for one subject, channel and language.
 *
 * Rendering lives here rather than in a template engine because the whole
 * vocabulary is `{{name}}` — and because the interesting decision is what
 * happens when a placeholder has no value, which no engine would get right for
 * us. See `render`.
 */
export class NotificationTemplate {
  constructor(
    readonly id: string,
    readonly subject: NotificationSubject,
    readonly channel: NotificationChannel,
    readonly locale: NotificationLocale,
    /** Null on channels that carry no subject line — SMS. */
    readonly subjectLine: string | null,
    readonly body: string,
  ) {}

  /** Every placeholder the text expects, deduplicated, in no particular order. */
  placeholders(): readonly string[] {
    const found = new Set<string>();
    for (const text of [this.subjectLine ?? '', this.body]) {
      for (const [, name] of text.matchAll(PLACEHOLDER)) {
        found.add(name);
      }
    }
    return [...found];
  }

  /**
   * Fills the template, or refuses.
   *
   * A missing value throws instead of rendering an empty string or leaving the
   * `{{token}}` in place. Both alternatives send a real message to a real person
   * with a hole in it — and an invitation whose link rendered blank is worse than
   * one that never arrived, because nobody is told.
   */
  render(values: Readonly<Record<string, string>>): { subjectLine: string | null; body: string } {
    const missing = this.placeholders().filter((name) => values[name] === undefined);
    if (missing.length > 0) {
      throw new MissingPlaceholdersError(missing.sort());
    }

    const fill = (text: string): string => text.replace(PLACEHOLDER, (_, name: string) => values[name]);

    return {
      subjectLine: this.subjectLine === null ? null : fill(this.subjectLine),
      body: fill(this.body),
    };
  }
}

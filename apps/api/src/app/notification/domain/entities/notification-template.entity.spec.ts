import { describe, expect, it } from 'vitest';
import {
  MissingPlaceholdersError,
  NotificationTemplate,
} from './notification-template.entity';
import { NotificationChannel, NotificationLocale, NotificationSubject } from '../notification.types';

/**
 * Rendering is the only logic a template has, and its interesting case is the
 * failure: a message that goes out with a hole in it reaches a real person, and
 * nobody is told.
 */

function aTemplate(subjectLine: string | null, body: string): NotificationTemplate {
  return new NotificationTemplate(
    'tpl-1',
    NotificationSubject.INVITATION,
    NotificationChannel.EMAIL,
    NotificationLocale.FR,
    subjectLine,
    body,
  );
}

describe('placeholders', () => {
  it('finds them in the subject line and the body alike', () => {
    const template = aTemplate('Bienvenue {{firstName}}', 'Rejoignez {{organizationName}}');

    expect([...template.placeholders()].sort()).toEqual(['firstName', 'organizationName']);
  });

  it('reports one occurrence for a name used twice', () => {
    const template = aTemplate('{{name}}', '{{name}} et {{name}}');

    expect(template.placeholders()).toEqual(['name']);
  });

  it('tolerates the spacing a human leaves inside the braces', () => {
    const template = aTemplate(null, 'Lien : {{ invitationUrl }}');

    expect(template.placeholders()).toEqual(['invitationUrl']);
  });

  it('finds none in a template that has none', () => {
    expect(aTemplate('Bonjour', 'Rien à remplir').placeholders()).toEqual([]);
  });
});

describe('render', () => {
  it('fills both parts', () => {
    const template = aTemplate('Bienvenue {{firstName}}', 'Rejoignez {{organizationName}}');

    expect(template.render({ firstName: 'Amine', organizationName: 'Ellouze' })).toEqual({
      subjectLine: 'Bienvenue Amine',
      body: 'Rejoignez Ellouze',
    });
  });

  it('replaces every occurrence, not only the first', () => {
    const template = aTemplate(null, '{{name}}, {{name}}');

    expect(template.render({ name: 'Amine' }).body).toBe('Amine, Amine');
  });

  it('keeps a null subject line null — an SMS has none to fill', () => {
    const template = aTemplate(null, 'Lien : {{invitationUrl}}');

    expect(template.render({ invitationUrl: 'https://x/y' }).subjectLine).toBeNull();
  });

  /**
   * The alternative — rendering `''` or leaving `{{invitationUrl}}` in place —
   * sends a real invitation whose link is blank or literal. Both are worse than
   * no email, because the failure is silent and the recipient is stuck.
   */
  it('refuses rather than send a message with a hole in it', () => {
    const template = aTemplate('Bienvenue {{firstName}}', 'Lien : {{invitationUrl}}');

    expect(() => template.render({ firstName: 'Amine' })).toThrow(MissingPlaceholdersError);
  });

  it('names every value it was not given, so the caller can fix them at once', () => {
    const template = aTemplate('{{a}}', '{{b}} {{c}}');

    const error = (() => {
      try {
        template.render({ b: 'x' });
      } catch (caught) {
        return caught as MissingPlaceholdersError;
      }
    })();

    expect(error?.placeholders).toEqual(['a', 'c']);
  });

  /** An empty string is a value somebody chose. Only `undefined` is an omission. */
  it('accepts an empty string as a real value', () => {
    const template = aTemplate(null, 'Reste : {{note}}');

    expect(template.render({ note: '' }).body).toBe('Reste : ');
  });

  it('ignores values the template never asked for', () => {
    const template = aTemplate(null, 'Bonjour {{firstName}}');

    expect(template.render({ firstName: 'Amine', unused: 'x' }).body).toBe('Bonjour Amine');
  });
});

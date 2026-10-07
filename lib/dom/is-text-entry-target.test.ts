import { describe, expect, it } from 'vitest';
import { isTextEntryTarget } from './is-text-entry-target';

describe('isTextEntryTarget', () => {
  it.each(['INPUT', 'TEXTAREA', 'SELECT', 'input', 'textarea'])(
    'treats <%s> as a field',
    (tagName) => {
      expect(isTextEntryTarget({ tagName })).toBe(true);
    }
  );

  it('treats editable content as a field', () => {
    expect(isTextEntryTarget({ tagName: 'DIV', isContentEditable: true })).toBe(
      true
    );
  });

  it.each(['BODY', 'BUTTON', 'A', 'DIV'])(
    'lets the shortcut through on <%s>',
    (tagName) => {
      expect(isTextEntryTarget({ tagName, isContentEditable: false })).toBe(
        false
      );
    }
  );

  it('copes with a target that is not an element', () => {
    expect(isTextEntryTarget(null)).toBe(false);
    expect(isTextEntryTarget(undefined)).toBe(false);
    expect(isTextEntryTarget({})).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';

import { Annotation } from './annotation';
import { selectText, TextSelector, TextUrn } from './text';

describe('TextUrn', () => {
  it.each`
    urn                                                    | ok
    ${'urn:cts:greekLit:tlg0012.tlg001.perseus-grc2:1.1'} | ${true}
    ${'urn:evwrit:text:1234'}                             | ${true}
    ${'cts:greekLit:tlg0012'}                             | ${false}
    ${'urn:cts: with space'}                              | ${false}
  `('$urn → $ok', ({ urn, ok }) => {
    expect(TextUrn.safeParse(urn).success).toBe(ok);
  });
});

describe('TextSelector', () => {
  it('rejects end before start', () => {
    expect(TextSelector.safeParse({ source: 'urn:x:y', start: 5, end: 2 }).success).toBe(false);
  });
});

describe('selectText', () => {
  it('counts code points, not UTF-16 units', () => {
    // 𝔸 is outside the BMP (2 UTF-16 units, 1 code point)
    expect(selectText('𝔸bc', { start: 1, end: 3 })).toBe('bc');
  });

  it('selects in the NFC form', () => {
    // ά as α + combining acute (NFD) → one code point in NFC
    const nfd = 'λάγος';
    expect(selectText(nfd, { start: 1, end: 2 })).toBe('ά'.normalize('NFC'));
    expect(selectText(nfd, { start: 2, end: 5 })).toBe('γος');
  });
});

describe('Annotation', () => {
  it('parses a minimal W3C annotation', () => {
    const a = Annotation.parse({
      '@context': 'http://www.w3.org/ns/anno.jsonld',
      id: 'urn:uuid:1',
      type: 'Annotation',
      target: [{ source: 'urn:cts:greekLit:tlg0012.tlg001:1.1', selector: { type: 'TextPositionSelector', start: 0, end: 5 } }],
    });
    expect(a.body).toEqual([]);
  });
});

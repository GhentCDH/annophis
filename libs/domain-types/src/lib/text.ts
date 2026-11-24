import { z } from 'zod';

/** URN of a text or passage, e.g. `urn:cts:greekLit:tlg0012.tlg001.perseus-grc2:1.1`. */
export const TextUrn = z.string().regex(/^urn:[a-z0-9][a-z0-9-]{0,31}:\S+$/i, 'invalid URN');
export type TextUrn = z.infer<typeof TextUrn>;

/**
 * A range in a text. `start`/`end` count Unicode code points (not UTF-16 units)
 * in the NFC-normalised text; `end` is exclusive.
 */
export const TextSelector = z
  .object({
    source: TextUrn,
    start: z.number().int().nonnegative(),
    end: z.number().int().nonnegative(),
  })
  .refine((s) => s.end >= s.start, { message: 'end must be >= start', path: ['end'] });
export type TextSelector = z.infer<typeof TextSelector>;

/** The text a selector points at: code points `[start, end)` of `text` after NFC normalisation. */
export const selectText = (text: string, { start, end }: Pick<TextSelector, 'start' | 'end'>) =>
  Array.from(text.normalize('NFC')).slice(start, end).join('');

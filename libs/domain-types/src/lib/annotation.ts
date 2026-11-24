import { z } from 'zod';

import { TextUrn } from './text';

/** W3C Web Annotation `TextPositionSelector`, using the code-point offsets of `TextSelector`. */
export const TextPositionSelector = z.object({
  type: z.literal('TextPositionSelector'),
  start: z.number().int().nonnegative(),
  end: z.number().int().nonnegative(),
});
export type TextPositionSelector = z.infer<typeof TextPositionSelector>;

export const AnnotationTarget = z.object({
  source: TextUrn,
  selector: TextPositionSelector,
});
export type AnnotationTarget = z.infer<typeof AnnotationTarget>;

export const AnnotationBody = z.object({
  type: z.string(),
  value: z.unknown().optional(),
  purpose: z.string().optional(),
});
export type AnnotationBody = z.infer<typeof AnnotationBody>;

/** Minimal W3C Web Annotation (https://www.w3.org/TR/annotation-model/). */
export const Annotation = z.object({
  '@context': z.literal('http://www.w3.org/ns/anno.jsonld'),
  id: z.string(),
  type: z.literal('Annotation'),
  body: z.array(AnnotationBody).default([]),
  target: z.array(AnnotationTarget).min(1),
  creator: z.string().optional(),
  created: z.iso.datetime().optional(),
});
export type Annotation = z.infer<typeof Annotation>;

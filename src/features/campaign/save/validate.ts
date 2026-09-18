/** Structural validation primitives for imported saves. */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Zero-based shift index within the injected campaign catalog. */
export function isShiftIndex(value: unknown, lessonCount: number): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value < lessonCount;
}

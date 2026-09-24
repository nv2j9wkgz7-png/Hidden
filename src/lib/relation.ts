// PostgREST to-one relations are objects; tolerate array-shaped test/SDK results.
export function relationOne<T>(
  value: T | T[] | null | undefined,
): T | undefined {
  return Array.isArray(value) ? value[0] : (value ?? undefined);
}

export function pickDependencies(source: Record<string, any>, keys: readonly string[]): Record<string, any> {
  const scoped: Record<string, any> = {};
  for (const key of keys) {
    if (!(key in source)) throw new Error(`Missing composition dependency: ${key}`);
    scoped[key] = source[key];
  }
  return Object.freeze(scoped);
}

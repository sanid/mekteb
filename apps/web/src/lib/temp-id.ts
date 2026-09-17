let counter = 0;

/**
 * A unique client-side id for rows that exist only until the server confirms
 * them — optimistic list entries, freshly-added canvas elements.
 *
 * Prefer this over `Date.now()`: two actions inside the same millisecond
 * produce the same timestamp, and `Date.now()` is a non-deterministic call
 * that the React compiler cannot treat as render-safe.
 *
 * The `t` marker keeps generated ids from ever colliding with the
 * timestamp-based ids already persisted by earlier versions.
 */
export function tempId(prefix: string): string {
  counter += 1;
  return `${prefix}-t${counter}`;
}

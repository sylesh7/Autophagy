import "react";

/**
 * Webflow emits `for="…"` on the <span> label inside its custom-checkbox
 * markup, not just on <label>. The browser ignores it there and the visual
 * result is unaffected, but React only types `htmlFor`, so the attribute is
 * declared here to keep the converted markup byte-identical to the original
 * rather than silently dropping it.
 */
declare module "react" {
  interface HTMLAttributes<T> {
    for?: string;
  }
}

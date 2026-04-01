/**
 * Join Tailwind / conditional class names.
 * @param  {...(string | undefined | null | false)} parts
 */
export function cn(...parts) {
  return parts.filter(Boolean).join(" ");
}

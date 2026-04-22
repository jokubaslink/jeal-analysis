/**
 * Inline validation message for admin forms (accessibility-friendly).
 */
export default function AdminFieldError({ id, message }) {
  if (!message) return null;
  return (
    <p
      id={id}
      role="alert"
      className="m-0 text-[length:var(--font-size-caption)] font-semibold leading-snug text-[var(--color-error-text)]"
    >
      {message}
    </p>
  );
}

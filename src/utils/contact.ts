// Contact form texts and the Turnstile site key. Pure (no `~` or astro imports) so
// `node --test` can run contact.test.ts directly.

// Cloudflare's documented test key: the widget always passes, and the real secret rejects its token
export const TURNSTILE_TEST_SITE_KEY = '1x00000000000000000000AA';

export const turnstileSiteKey = (env: {
  PUBLIC_TURNSTILE_SITE_KEY?: string;
}): string => env.PUBLIC_TURNSTILE_SITE_KEY?.trim() || TURNSTILE_TEST_SITE_KEY;

const FALLBACK_STRINGS = {
  es: {
    name_label: 'Nombre',
    email_label: 'Correo electrónico',
    message_label: 'Mensaje',
    submit_label: 'Enviar',
    sending_label: 'Enviando…',
    success_message: '¡Gracias! Tu mensaje fue enviado. Te responderé pronto.',
    error_message:
      'No se pudo enviar el mensaje. Inténtalo de nuevo en unos minutos.',
    invalid_message: 'Revisa los campos marcados.',
    captcha_message:
      'No pudimos verificar que no eres un robot. Inténtalo de nuevo.',
    noscript_message: 'Activa JavaScript para enviar el formulario.',
    required_note: 'Todos los campos son obligatorios.',
    name_error: 'Escribe tu nombre.',
    email_error: 'Escribe un correo válido, como nombre@ejemplo.com.',
    message_error: 'Escribe tu mensaje.',
  },
  en: {
    name_label: 'Name',
    email_label: 'Email',
    message_label: 'Message',
    submit_label: 'Send',
    sending_label: 'Sending…',
    success_message:
      "Thanks! Your message was sent. I'll get back to you soon.",
    error_message:
      "The message couldn't be sent. Please try again in a few minutes.",
    invalid_message: 'Please check the highlighted fields.',
    captcha_message: "We couldn't verify you're not a robot. Please try again.",
    noscript_message: 'Turn on JavaScript to send the form.',
    required_note: 'All fields are required.',
    name_error: 'Enter your name.',
    email_error: 'Enter a valid email, like name@example.com.',
    message_error: 'Enter your message.',
  },
};

export type ContactStrings = typeof FALLBACK_STRINGS.en;

/** Each non-empty `contact_form` field, else the built-in fallback for `lang`. */
export function contactStrings(
  blok: Record<string, unknown> | null | undefined,
  lang: string
): ContactStrings {
  const fallback =
    FALLBACK_STRINGS[lang as keyof typeof FALLBACK_STRINGS] ??
    FALLBACK_STRINGS.en;
  const keys = Object.keys(fallback) as (keyof ContactStrings)[];
  return Object.fromEntries(
    keys.map((key) => {
      const value = blok?.[key];
      return [
        key,
        typeof value === 'string' && value.trim() ? value : fallback[key],
      ];
    })
  ) as ContactStrings;
}

interface ImportMetaEnv {
  readonly PUBLIC_DEFAULT_LANGUAGE: string;
  readonly PUBLIC_AVAILABLE_LANGUAGES: string;
  readonly PUBLIC_BUILD_TYPE?: 'static' | 'server';
  readonly PUBLIC_CF_ANALYTICS_TOKEN?: string;
  readonly PUBLIC_TURNSTILE_SITE_KEY?: string;
  readonly PUBLIC_SITE_URL?: string;
  readonly PUBLIC_ALLOW_INDEXING?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

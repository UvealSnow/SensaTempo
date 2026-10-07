interface ImportMetaEnv {
  readonly PUBLIC_DEFAULT_LANGUAGE: string;
  readonly PUBLIC_AVAILABLE_LANGUAGES: string;
  readonly PUBLIC_BUILD_TYPE?: 'static' | 'server';
  readonly PUBLIC_CF_ANALYTICS_TOKEN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

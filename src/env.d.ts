interface ImportMetaEnv {
  readonly PUBLIC_DEFAULT_LANGUAGE: string;
  readonly PUBLIC_AVAILABLE_LANGUAGES: string;
  readonly PUBLIC_BUILD_TYPE?: 'static' | 'server';
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

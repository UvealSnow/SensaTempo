interface ImportMetaEnv {
  readonly PUBLIC_DEFAULT_LANGUAGE: string;
  readonly PUBLIC_AVAILABLE_LANGUAGES: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

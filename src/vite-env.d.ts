/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Sentry DSN for the web/iOS bundle. Public by design; set at build time. */
  readonly VITE_SENTRY_DSN?: string;
  /** Optional override for the Sentry environment tag. */
  readonly VITE_SENTRY_ENVIRONMENT?: string;
  /** Injected by vite.config.ts from package.json "version". */
  readonly VITE_APP_VERSION: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

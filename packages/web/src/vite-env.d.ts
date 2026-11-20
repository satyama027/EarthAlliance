/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Which platform adapter to build for (ADR-0001). Default: `web`. */
  readonly VITE_PLATFORM?: string;
  /** Game version stamped into saves; CI sets it from the release tag. */
  readonly VITE_APP_VERSION?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

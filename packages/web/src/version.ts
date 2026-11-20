/** The game build stamped into saves. CI sets `VITE_APP_VERSION` from the release tag. */
export const APP_VERSION: string = import.meta.env.VITE_APP_VERSION ?? '0.0.0-dev';

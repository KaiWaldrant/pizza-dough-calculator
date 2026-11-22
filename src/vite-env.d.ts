interface ImportMetaEnv {
  /** The app version, set at build time (the Docker build's APP_VERSION); unset in development. */
  readonly VITE_APP_VERSION?: string;
}

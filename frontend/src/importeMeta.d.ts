interface ImportMeta {
  readonly PUBLIC_URL: string;
  readonly NODE_ENV: 'development' | 'production' | 'test';
  glob: import('vite/types/importGlob').ImportGlobFunction;
}

// / <reference types="vite/client" />

declare module 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url' {
  const workerUrl: string;
  export default workerUrl;
}

import * as Comlink from 'comlink';
import { ZonalOptions } from '../config/types';

// instantiate worker to handle zonal statistics requests
const text = `
importScripts("https://unpkg.com/comlink/dist/umd/comlink.js");
importScripts("https://unpkg.com/zonal@0.7.3/zonal.min.js");

Comlink.expose(zonal);
`;
const blob = new Blob([text], { type: 'text/javascript' });
const objectURL = URL.createObjectURL(blob);
const worker = new Worker(objectURL);
const zonal = Comlink.wrap(worker);

export async function calculate(options: ZonalOptions) {
  return zonal.calculate(options);
}

// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
// import '@testing-library/jest-dom/extend-expect';
import '@testing-library/jest-dom';
import 'cross-fetch/polyfill';

import { cleanup } from '@testing-library/react/pure';

// @testing-library/react/pure (used via test/render.tsx) does not auto-cleanup.
afterEach(() => {
  cleanup();
});

import { randomBytes } from 'crypto';

// jsdom exposes a partial Performance API; maplibre-gl expects mark/measure.
const perf = global.performance;
if (perf && typeof perf.mark !== 'function') {
  Object.assign(perf, {
    mark: jest.fn(),
    measure: jest.fn(),
    clearMarks: jest.fn(),
    clearMeasures: jest.fn(),
    getEntriesByName: jest.fn(() => []),
    getEntriesByType: jest.fn(() => []),
  });
}

// node-fetch (via cross-fetch in Node) rejects relative URLs. React 19 flushes
// passive effects during render/act more aggressively; boundary hooks call fetch.
const crossFetch = global.fetch;
global.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
  const url =
    typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.href
        : input.url;
  if (!/^https?:\/\//i.test(url)) {
    return Promise.resolve(
      new Response('{}', {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
  }
  return crossFetch(input, init);
};

import React from 'react';

// Polyfill TextEncoder and TextDecoder for jsPDF compatibility
if (typeof global.TextEncoder === 'undefined') {
  const { TextEncoder, TextDecoder } = require('util');
  global.TextEncoder = TextEncoder;
  global.TextDecoder = TextDecoder;
}

// Mock Workers

global.URL.createObjectURL = jest.fn(() => 'worker');
class Worker {
  url: any;
  onmessage: (v: any) => void;

  constructor(stringUrl: any) {
    this.url = stringUrl;
    this.onmessage = () => {};
  }

  postMessage(msg: any) {
    this.onmessage(msg);
  }
}

// @ts-ignore

window.Worker = Worker;

Object.defineProperty(global.self, 'crypto', {
  value: {
    getRandomValues: (arr: any) => {
      if (!arr) {
        return arr;
      }

      return randomBytes(arr.buffer.byteLength);
    },
  },
});

// https://github.com/diegomura/react-pdf/issues/710
jest.mock('@react-pdf/renderer', () => ({
  PDFDownloadLink: jest.fn(() => null),
  PDFViewer: jest.fn(() => null),
  StyleSheet: { create: () => {} },
  Font: { register: () => {} },
}));

// https://github.com/remarkjs/react-markdown/issues/635
jest.mock(
  'react-markdown',
  () => (props: { children: React.ReactNode }) => props.children,
);

jest.mock('max-inscribed-circle', () => ({}));

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useLocation: () => ({
    pathname: 'localhost:3000/',
  }),
}));

// jest.mock('i18next', () => ({
//   __esModule: true,
//   default: {
//     t: (k: any) => k,
//     use: () => ({
//       init: () => {},
//     }),
//   },
// }));

// mock getContext based on https://github.com/hustcc/jest-canvas-mock/issues/2

HTMLCanvasElement.prototype.getContext = jest.fn();

global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

jest.mock('chartjs-plugin-annotation', () => ({
  // Mock the necessary parts of the module
  default: {
    id: 'annotation',
    beforeInit: jest.fn(),
    afterDraw: jest.fn(),
    destroy: jest.fn(),
  },
}));

// Mock zonal-utils to avoid Web Worker issues in tests
jest.mock('utils/zonal-utils', () => ({
  calculate: jest.fn(() => Promise.resolve({})),
}));

// Mock jsPDF to prevent Node.js API issues in tests
jest.mock('jspdf', () => ({
  jsPDF: jest.fn().mockImplementation(() => ({
    addImage: jest.fn(),
    save: jest.fn(),
    internal: {
      pageSize: {
        getHeight: jest.fn(() => 800),
        getWidth: jest.fn(() => 600),
      },
    },
  })),
}));

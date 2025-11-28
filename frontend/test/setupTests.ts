import React from 'react';
// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
// import '@testing-library/jest-dom/extend-expect';
import '@testing-library/jest-dom';
// eslint-disable-next-line import/no-extraneous-dependencies
import 'cross-fetch/polyfill';
import { randomBytes } from 'crypto';

// Polyfill TextEncoder and TextDecoder for jsPDF compatibility
if (typeof global.TextEncoder === 'undefined') {
  const { TextEncoder, TextDecoder } = require('util');
  global.TextEncoder = TextEncoder;
  global.TextDecoder = TextDecoder;
}

// Mock Workers
// eslint-disable-next-line fp/no-mutation
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

// eslint-disable-next-line fp/no-mutation
// @ts-ignore
// eslint-disable-next-line fp/no-mutation
window.Worker = Worker;

// eslint-disable-next-line fp/no-mutating-methods
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

function stubMuiComponent(componentName: string) {
  jest.doMock(
    `@mui/material/${componentName}`,
    () => `mock-${componentName}`,
  );
}

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

stubMuiComponent('Typography');
stubMuiComponent('Button');
stubMuiComponent('TextField');
stubMuiComponent('Avatar');
stubMuiComponent('Tabs');
stubMuiComponent('Tab');
stubMuiComponent('AppBar');
stubMuiComponent('Toolbar');
stubMuiComponent('Tooltip');
stubMuiComponent('Link');
stubMuiComponent('Card');
stubMuiComponent('CardContent');
stubMuiComponent('Chip');
stubMuiComponent('List');
stubMuiComponent('ListItem');
stubMuiComponent('ListItemText');
stubMuiComponent('Menu');
stubMuiComponent('MenuItem');
stubMuiComponent('Modal');
stubMuiComponent('Popover');
stubMuiComponent('CircularProgress');
// Hidden was removed in MUI v5
stubMuiComponent('Accordion');
stubMuiComponent('AccordionSummary');
stubMuiComponent('AccordionDetails');
stubMuiComponent('Checkbox');
stubMuiComponent('Drawer');
stubMuiComponent('Divider');
stubMuiComponent('Snackbar');
stubMuiComponent('Stepper');
stubMuiComponent('StepButton');
stubMuiComponent('Step');
stubMuiComponent('Switch');
stubMuiComponent('Dialog');
stubMuiComponent('DialogActions');
stubMuiComponent('DialogContent');
stubMuiComponent('DialogContentText');
stubMuiComponent('DialogTitle');
stubMuiComponent('Icon');
stubMuiComponent('Radio');

function stubMuiIcon(iconName: any) {
  jest.doMock(`@mui/icons-material/${iconName}`, () => `mock-${iconName}`);
}

stubMuiIcon('ArrowDropDown');
stubMuiIcon('BarChart');
stubMuiIcon('ChevronLeft');
stubMuiIcon('ChevronRight');
stubMuiIcon('CloudDownload');
stubMuiIcon('Image');
stubMuiIcon('Visibility');
stubMuiIcon('VisibilityOff');

// mock getContext based on https://github.com/hustcc/jest-canvas-mock/issues/2
// eslint-disable-next-line fp/no-mutation
HTMLCanvasElement.prototype.getContext = jest.fn();

// eslint-disable-next-line fp/no-mutation
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

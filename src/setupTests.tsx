// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom/extend-expect';
import { randomBytes } from 'crypto';

// Mock Workers
// eslint-disable-next-line fp/no-mutation
global.URL.createObjectURL = jest.fn(() => 'worker');
class Worker {
  constructor(stringUrl) {
    this.url = stringUrl;
    this.onmessage = () => {};
  }

  postMessage(msg) {
    this.onmessage(msg);
  }
}
// eslint-disable-next-line fp/no-mutation
window.Worker = Worker;

jest.mock('mapbox-gl/dist/maplibre-gl', () => ({
  GeolocateControl: jest.fn(),
  Map: jest.fn(() => ({
    addControl: jest.fn(),
    on: jest.fn(),
    remove: jest.fn(),
  })),
  NavigationControl: jest.fn(),
}));

// eslint-disable-next-line fp/no-mutating-methods
Object.defineProperty(global.self, 'crypto', {
  value: {
    getRandomValues: <T extends ArrayBufferView | null>(arr: T) => {
      if (!arr) {
        return arr;
      }

      return randomBytes(arr.buffer.byteLength);
    },
  },
});

// Based on https://github.com/mapbox/mapbox-gl-js/issues/3436#issuecomment-485535598
jest.mock('mapbox-gl/dist/mapbox-gl', () => ({
  GeolocateControl: jest.fn(),
  Map: jest.fn(() => ({
    addControl: jest.fn(),
    on: jest.fn(),
    remove: jest.fn(),
  })),
  NavigationControl: jest.fn(),
}));

// https://github.com/diegomura/react-pdf/issues/710
jest.mock('@react-pdf/renderer', () => ({
  PDFDownloadLink: jest.fn(() => null),
  PDFViewer: jest.fn(() => null),
  StyleSheet: { create: () => {} },
  Font: { register: () => {} },
}));

function stubMuiComponent(componentName: string) {
  jest.doMock(
    `@material-ui/core/${componentName}/${componentName}`,
    () => `mock-${componentName}`,
  );
}

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useLocation: () => ({
    pathname: 'localhost:3000/',
  }),
}));

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
stubMuiComponent('Hidden');
stubMuiComponent('ExpansionPanel');
stubMuiComponent('ExpansionPanelSummary');
stubMuiComponent('ExpansionPanelDetails');
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

function stubMuiIcon(iconName: string) {
  jest.doMock(`@material-ui/icons/${iconName}`, () => `mock-${iconName}`);
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

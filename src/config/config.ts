import {
  mongoliaConfig,
  mongoliaRawLayers,
  mongoliaRawTables,
} from './mongolia';

const DEFAULT = 'mongolia';

type Country = 'mongolia';

const { REACT_APP_COUNTRY: COUNTRY } = process.env;

const configMap = {
  mongolia: {
    appConfig: mongoliaConfig,
    rawLayers: mongoliaRawLayers,
    rawTables: mongoliaRawTables,
  },
} as const;

const { appConfig, rawLayers, rawTables } = configMap[
  (COUNTRY as Country) || DEFAULT
];

export { appConfig, rawLayers, rawTables };

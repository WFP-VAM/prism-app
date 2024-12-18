import { render } from '@testing-library/react';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import configureStore from 'redux-mock-store';
import { AnticipatoryActionState } from 'context/anticipatoryAction/AADroughtStateSlice/types';
import { Panel } from 'config/types';
import { defaultDialogs, mockAAData } from '../test.utils';
import { timelineTransform } from './utils';
import Timeline from '.';

const mockStore = configureStore([]);

const filters: AnticipatoryActionState['filters'] = {
  selectedWindow: 'Window 1',
  categories: {
    Severe: true,
    Moderate: true,
    Normal: true,
    Mild: true,
    na: true,
    ny: true,
  },
  selectedIndex: '',
  selectedDate: '2024-02-01',
};

const store = mockStore({
  mapState: {
    layers: [],
    dateRange: { startDate: 1701432000000 },
    maplibreMap: () => {},
    errors: [],
    layersData: [],
    loadingLayerIds: [],
    boundaryRelationData: {},
  },
  serverState: { availableDates: {}, loading: false },
  anticipatoryActionDroughtState: {
    filters,
    selectedDistrict: 'Changara',
    monitoredDistricts: ['Changara'],
    data: mockAAData,
  },
  leftPanelState: {
    tabValue: Panel.AnticipatoryActionDrought,
  },
});

test('renders as expected', () => {
  const { container } = render(
    <BrowserRouter>
      <Provider store={store}>
        <Timeline dialogs={defaultDialogs} />
      </Provider>
    </BrowserRouter>,
  );
  expect(container).toMatchSnapshot();
});

test('District view transformation', () => {
  const res = timelineTransform({
    data: mockAAData,
    filters,
    selectedDistrict: 'Changara',
  });

  expect(res).toEqual(out);
});

const out = {
  windowData: {
    'Window 1': {
      months: [
        ['2023-08-01', 'Aug'],
        ['2023-09-01', 'Sep'],
        ['2023-10-01', 'Oct'],
        ['2023-11-01', 'Nov'],
      ],
      rows: {
        '32': {
          status: {
            category: 'Mild',
            phase: 'Ready',
          },
          data: [
            {
              category: 'Mild',
              district: 'Changara',
              index: 'SPI DJF',
              type: 'SPI',
              window: 'Window 1',
              new: false,
              phase: 'Ready',
              probability: 0.16,
              trigger: 0.17,
              date: '2023-08-01',
              season: '2023-24',
              isValid: false,
              isOtherPhaseValid: false,
            },
            {
              category: 'Mild',
              district: 'Changara',
              index: 'SPI DJF',
              type: 'SPI',
              window: 'Window 1',
              new: false,
              phase: 'Ready',
              probability: 0.22,
              trigger: 0.3,
              date: '2023-09-01',
              season: '2023-24',
              isValid: false,
              isOtherPhaseValid: false,
            },
            {
              category: 'Mild',
              district: 'Changara',
              index: 'SPI DJF',
              type: 'SPI',
              window: 'Window 1',
              new: false,
              phase: 'Ready',
              probability: 0.31,
              trigger: 0.2,
              date: '2023-10-01',
              season: '2023-24',
              isValid: true,
              isOtherPhaseValid: true,
            },
          ],
        },
        '33': {
          status: {
            category: 'Mild',
            phase: 'Set',
          },
          data: [
            {
              category: 'Mild',
              district: 'Changara',
              index: 'SPI DJF',
              type: 'SPI',
              window: 'Window 1',
              new: false,
              phase: 'Set',
              probability: 0.12,
              trigger: 0.3,
              date: '2023-09-01',
              season: '2023-24',
              isValid: false,
              isOtherPhaseValid: false,
            },
            {
              category: 'Mild',
              district: 'Changara',
              index: 'SPI DJF',
              type: 'SPI',
              window: 'Window 1',
              new: false,
              phase: 'Set',
              probability: 0.34,
              trigger: 0.33,
              date: '2023-10-01',
              season: '2023-24',
              isValid: false,
              isOtherPhaseValid: false,
            },
            {
              category: 'Mild',
              district: 'Changara',
              index: 'SPI DJF',
              type: 'SPI',
              window: 'Window 1',
              new: true,
              phase: 'Set',
              probability: 0.28,
              trigger: 0.25,
              date: '2023-11-01',
              season: '2023-24',
              isValid: true,
              isOtherPhaseValid: true,
            },
          ],
        },
        '42': {
          status: {
            category: 'Moderate',
            phase: 'Ready',
          },
          data: [
            {
              category: 'Moderate',
              district: 'Changara',
              index: 'SPI DJF',
              type: 'SPI',
              window: 'Window 1',
              new: true,
              phase: 'Ready',
              probability: 0.19,
              trigger: 0.1,
              date: '2023-09-01',
              season: '2023-24',
              isValid: true,
              isOtherPhaseValid: false,
            },
            {
              category: 'Moderate',
              district: 'Changara',
              index: 'SPI DJF',
              type: 'SPI',
              window: 'Window 1',
              new: false,
              phase: 'Ready',
              probability: 0.28,
              trigger: 0.2,
              date: '2023-10-01',
              season: '2023-24',
              isValid: true,
              isOtherPhaseValid: false,
            },
          ],
        },
        '43': {
          status: {
            category: 'Moderate',
            phase: 'Set',
          },
          data: [
            {
              category: 'Moderate',
              district: 'Changara',
              index: 'SPI DJF',
              type: 'SPI',
              window: 'Window 1',
              new: false,
              phase: 'Set',
              probability: 0.25,
              trigger: 0.26,
              date: '2023-10-01',
              season: '2023-24',
              isValid: false,
              isOtherPhaseValid: true,
            },
            {
              category: 'Moderate',
              district: 'Changara',
              index: 'SPI DJF',
              type: 'SPI',
              window: 'Window 1',
              new: false,
              phase: 'Set',
              probability: 0.22,
              trigger: 0.3,
              date: '2023-11-01',
              season: '2023-24',
              isValid: false,
              isOtherPhaseValid: true,
            },
          ],
        },
      },
    },
  },
  allRows: {
    '32': {
      status: {
        category: 'Mild',
        phase: 'Ready',
      },
      data: [],
    },
    '33': {
      status: {
        category: 'Mild',
        phase: 'Set',
      },
      data: [],
    },
    '42': {
      status: {
        category: 'Moderate',
        phase: 'Ready',
      },
      data: [],
    },
    '43': {
      status: {
        category: 'Moderate',
        phase: 'Set',
      },
      data: [],
    },
  },
};

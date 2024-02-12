import timezoneMock from 'timezone-mock';
import { createEWSDatesArray } from './ews-utils';

const f = () => {
  expect(createEWSDatesArray(testEndDate)).toEqual(ret);
};

describe('createEWSDatesArray', () => {
  afterAll(() => {
    timezoneMock.unregister();
  });

  test('Should work with UTC', () => {
    timezoneMock.register('UTC');
    f();
  });

  test('Should work with US/Pacific', () => {
    timezoneMock.register('US/Pacific');
    f();
  });

  test('Should work with Etc/GMT-1', () => {
    timezoneMock.register('Etc/GMT-1');
    f();
  });
});

const testEndDate = 1611741612345;
const ret = [
  1609502400000,
  1609588800000,
  1609675200000,
  1609761600000,
  1609848000000,
  1609934400000,
  1610020800000,
  1610107200000,
  1610193600000,
  1610280000000,
  1610366400000,
  1610452800000,
  1610539200000,
  1610625600000,
  1610712000000,
  1610798400000,
  1610884800000,
  1610971200000,
  1611057600000,
  1611144000000,
  1611230400000,
  1611316800000,
  1611403200000,
  1611489600000,
  1611576000000,
  1611662400000,
  1611748800000,
];

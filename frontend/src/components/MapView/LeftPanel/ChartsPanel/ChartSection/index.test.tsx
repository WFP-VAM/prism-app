import timezoneMock from 'timezone-mock';
import { generateDateStrings } from '.';
import { timezones } from '../../../../../../test/helpers';

const f = () => {
  const ret = generateDateStrings(
    new Date('2023-01-01'),
    new Date('2024-01-01'),
  );
  expect(ret).toEqual(result);
};

describe('generateDateStrings', () => {
  afterAll(() => {
    timezoneMock.unregister();
  });

  test.each(timezones)('Should work with %s', timezone => {
    timezoneMock.register(timezone);
    f();
  });
});

const result = [
  '2023-01-01',
  '2023-01-11',
  '2023-01-21',
  '2023-02-01',
  '2023-02-11',
  '2023-02-21',
  '2023-03-01',
  '2023-03-11',
  '2023-03-21',
  '2023-04-01',
  '2023-04-11',
  '2023-04-21',
  '2023-05-01',
  '2023-05-11',
  '2023-05-21',
  '2023-06-01',
  '2023-06-11',
  '2023-06-21',
  '2023-07-01',
  '2023-07-11',
  '2023-07-21',
  '2023-08-01',
  '2023-08-11',
  '2023-08-21',
  '2023-09-01',
  '2023-09-11',
  '2023-09-21',
  '2023-10-01',
  '2023-10-11',
  '2023-10-21',
  '2023-11-01',
  '2023-11-11',
  '2023-11-21',
  '2023-12-01',
  '2023-12-11',
  '2023-12-21',
  '2024-01-01',
];

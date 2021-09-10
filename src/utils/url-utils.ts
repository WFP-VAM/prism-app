import { useHistory } from 'react-router-dom';
import moment from 'moment';

export type URLParams = {
  hazardLayerId?: string;
  baselineLayerId?: string;
  date?: number;
};

/*
  transforms the string value according to the field specified in the
  type URLParams
*/
const parseValue = (key: string, value: string): URLParams[keyof URLParams] => {
  switch (key) {
    case 'date':
      return moment(value).valueOf();
    default:
      return value;
  }
};

/*
  Serialized value to string depending on the parameter specified in the
  type URLParams
*/
const valueToString = (
  key: string,
  value: URLParams[keyof URLParams],
): string => {
  switch (key) {
    case 'date':
      return moment(value).format('YYYY-MM-DD');
    default:
      return value as string;
  }
};

/*
  Serialized value to string depending on the parameter specified in the
  type URLParams
*/
const parseHistory = (locationSearch: string): URLParams =>
  locationSearch === ''
    ? ({} as URLParams)
    : locationSearch
        .substring(1)
        .split('&')
        .map(l => l.split('='))
        .reduce(
          (obj, [key, value]) => ({
            ...obj,
            [key]: parseValue(key, value),
          }),
          {} as URLParams,
        );

/*
  Serialize urlParams object to string.
*/
const urlParamsToString = (params: URLParams): string =>
  Object.entries(params)
    .map(([key, value]) => `${key}=${valueToString(key, value)}`)
    .join('&');

/*
  This custom hook tracks the browser url string, which is defined by the useHistory hook.
  We created additional functions to update the url based on user events, such as select date
  or select layer.
*/
export const useUrlHistory = () => {
  const { replace, location } = useHistory();

  const urlParams = parseHistory(location.search);

  const updateHistory = (obj: URLParams) => {
    const newUrl = { ...urlParams, ...obj };
    replace({ search: urlParamsToString(newUrl) });
  };

  const clearHistory = () => {
    replace({ search: '' });
  };

  const removeKeyFromUrl = (urlKey: keyof URLParams) => {
    const newUrl = Object.entries(urlParams).reduce((obj, [key, value]) => {
      if (key === urlKey) {
        return obj;
      }

      if (urlKey === 'hazardLayerId' && key === 'date') {
        return obj;
      }

      return { ...obj, [key]: value };
    }, {} as URLParams);

    replace({ search: urlParamsToString(newUrl) });
  };

  return { urlParams, updateHistory, clearHistory, removeKeyFromUrl };
};

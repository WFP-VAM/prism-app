import { getFormattedDate } from 'utils/date-utils';
import { DateFormat } from 'utils/name-utils';

export const createStaticRasterLayerUrl = (
  baseUrl: string,
  dates: string[] | undefined,
  selectedDate: number | undefined,
) =>
  dates
    ? baseUrl.replace(
        `{${DateFormat.DefaultSnakeCase}}`,
        getFormattedDate(selectedDate, 'snake') as string,
      )
    : baseUrl;

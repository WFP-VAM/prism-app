import * as moment from 'moment';

export function setNoon(date: string): string {
  return moment.utc(date.split('T')[0]).set({ hour: 12 }).format();
}

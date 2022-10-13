import { getFeatures } from './utils';

import { Layer } from '../layer';

export default class FeatureLayer extends Layer {
  async getFeatures(
    {
      count = 10,
      debug = false,
      fetch: _fetch,
      method = 'POST',
      wait = 0,
      ...rest
    }: {
      count?: number;
      debug?: boolean;
      fetch?: any;
      method?: 'GET' | 'POST';
      wait?: number;
    } = { count: 10, debug: false, fetch: undefined, method: 'POST', wait: 0 },
  ): Promise<any> {
    // to-do: check if post available
    return getFeatures(await this.capabilities, this.id, {
      count,
      debug,
      fetch: _fetch || this._fetch,
      ...rest,
    });
  }
}

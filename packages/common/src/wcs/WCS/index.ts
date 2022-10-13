import { Base } from '../../base';
import WCSLayer from '../WCSLayer';

import { findLayerIds, findCoverageDisplayNames } from '../utils';

export default class WCS extends Base {
  async getLayerIds(): Promise<string[]> {
    return findLayerIds(await this.capabilities);
  }

  async getLayerNames(): Promise<string[]> {
    return findCoverageDisplayNames(await this.capabilities);
  }

  async getLayer(layerId: string): Promise<WCSLayer> {
    this.checkLayer(layerId);
    return new WCSLayer({
      capabilities: this.capabilities,
      id: layerId,
      fetch: this._fetch,
    });
  }
}

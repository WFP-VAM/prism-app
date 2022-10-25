import { Base } from '../../base';

import { getLayerIds, getLayerNames } from '../utils';

import WMSLayer from '../layer';

export class WMS extends Base {
  async getLayerIds(): Promise<string[]> {
    return getLayerIds(await this.capabilities);
  }

  async getLayerNames(): Promise<string[]> {
    return getLayerNames(await this.capabilities, { clean: true });
  }

  async getLayer(layerId: string): Promise<WMSLayer> {
    this.checkLayer(layerId);
    return new WMSLayer({
      capabilities: this.capabilities,
      id: layerId,
      fetch: this.fetch,
    });
  }
}

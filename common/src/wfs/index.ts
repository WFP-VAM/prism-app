import { Base } from "../base";

import {
  getFeatureTypesFromCapabilities,
  parseFullFeatureTypeNames,
} from "./utils";

import FeatureLayer from "./layer";

export class WFS extends Base {
  async getLayerIds() {
    const caps = await this.capabilities;
    return parseFullFeatureTypeNames(caps);
  }

  async getLayerNames() {
    const caps = await this.capabilities;
    return getFeatureTypesFromCapabilities(caps).map(
      (featureType) => featureType.name.short
    );
  }

  async getLayer(layerId: string): Promise<FeatureLayer> {
    this.checkLayer(layerId);
    return new FeatureLayer({
      capabilities: this.capabilities,
      id: layerId,
      fetch: this.fetch,
    });
  }
}

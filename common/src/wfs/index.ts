import { Base } from "../base";

import {
  getFeatureTypesFromCapabilities,
  parseFullFeatureTypeNames,
} from "./utils";

import FeatureLayer from "./layer";

export class WFS extends Base {
  version = "1.0.0"; // default version

  async getLayerIds() {
    return parseFullFeatureTypeNames(await this.getCapabilities());
  }

  async getLayerNames() {
    return getFeatureTypesFromCapabilities(await this.getCapabilities()).map(
      (featureType) => featureType.name.short,
    );
  }

  async getLayer(layerId: string): Promise<FeatureLayer> {
    this.checkLayer(layerId);
    return new FeatureLayer({
      capabilities: await this.getCapabilities(),
      id: layerId,
      fetch: this.fetch,
    });
  }
}

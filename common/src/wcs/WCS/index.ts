import { Base } from "../../base";
import WCSLayer from "../WCSLayer";

import {
  findCoverages,
  findLayerId,
  findLayerIds,
  findCoverageDisplayNames,
  getAllLayerDays,
} from "../utils";

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
      fetch: this.fetch,
    });
  }

  async getLayers(): Promise<WCSLayer[]> {
    const capabilities = await this.capabilities;
    const coverages = findCoverages(capabilities);
    return Promise.all(
      coverages.map(
        (layer) =>
          new WCSLayer({
            capabilities: this.capabilities,
            id: findLayerId(layer)!,
            layer,
            fetch: this.fetch,
          })
      )
    );
  }

  async getLayerDays(): Promise<{ [layerId: string]: number[] }> {
    return getAllLayerDays(await this.capabilities);
  }
}

import { Base } from "../../base";

import {
  findLayers,
  getAllLayerDays,
  getLayerIds,
  getLayerNames,
} from "../utils";
import { findName } from "../../utils";

import WMSLayer from "../layer";

export class WMS extends Base {
  service = "WMS";

  async getLayerIds(): Promise<string[]> {
    return getLayerIds(await this.getCapabilities());
  }

  async getLayerNames(): Promise<string[]> {
    return getLayerNames(await this.getCapabilities(), { clean: true });
  }

  async getLayer(layerId: string): Promise<WMSLayer> {
    this.checkLayer(layerId);
    return new WMSLayer({
      capabilities: await this.getCapabilities(),
      id: layerId,
      fetch: this.fetch,
    });
  }

  async getLayers(): Promise<WMSLayer[]> {
    const capabilities = await this.getCapabilities();
    const layers = findLayers(capabilities);
    return Promise.all(
      layers.map(
        (layer) =>
          new WMSLayer({
            capabilities,
            id: findName(layer)!,
            fetch: this.fetch,
            layer,
          }),
      ),
    );
  }

  async getLayerDays(): Promise<{ [layerId: string]: number[] }> {
    return getAllLayerDays(await this.getCapabilities());
  }
}

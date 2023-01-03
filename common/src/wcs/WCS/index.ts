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
  service = "WCS";

  async getLayerIds(): Promise<string[]> {
    return findLayerIds(await this.getCapabilities());
  }

  async getLayerNames(): Promise<string[]> {
    return findCoverageDisplayNames(await this.getCapabilities());
  }

  async getLayer(layerId: string): Promise<WCSLayer> {
    this.checkLayer(layerId);
    return new WCSLayer({
      capabilities: await this.getCapabilities(),
      id: layerId,
      fetch: this.fetch,
    });
  }

  async getLayers({
    debug = false,
    count = 10,
    errorStrategy = "throw",
  }: { count?: number; debug?: boolean; errorStrategy?: string } = {}): Promise<
    WCSLayer[]
  > {
    const capabilities = await this.getCapabilities();
    const coverages = findCoverages(capabilities);
    return (Promise.all(
      coverages.slice(0, count).map((layer, layerIndex) => {
        try {
          return new WCSLayer({
            capabilities,
            debug,
            id: findLayerId(layer)!,
            layer,
            fetch: this.fetch,
            wait: layerIndex * 200, // wait 200ms between intialization DescribeCoverage request
          });
        } catch (error) {
          if (errorStrategy === "skip") {
            return undefined;
          }
          throw error;
        }
      })
    ).then((values) =>
      values.filter((value) => value !== undefined)
    ) as any) as Promise<WCSLayer[]>;
  }

  async getLayerDays(options?: {
    errorStrategy: string;
  }): Promise<{ [layerId: string]: number[] }> {
    try {
      // we have to use the version 1.x.x for capabilities
      // because version 2.x.x doesn't include date information
      return getAllLayerDays(await this.getCapabilities({ version: "1.0.0" }));
    } catch (error) {
      if (options?.errorStrategy === "empty") {
        return {};
      }
      throw error;
    }
  }
}

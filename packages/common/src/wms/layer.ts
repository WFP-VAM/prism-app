import { Layer } from "../layer";

import { createGetMapUrl, findLayer, parseLayerDates } from "./utils";

export default class WMSLayer extends Layer {
  _layer: Promise<string>; // xml describing layer from GetCapabilities request
  _dates: Promise<string[]>;

  constructor(options: ConstructorParameters<typeof Layer>[0]) {
    super(options);

    this._layer = this.capabilities.then(xml => findLayer(xml, this.id)!);
    this._dates = this._layer.then(xml => parseLayerDates(xml));
  }

  async getLayerDates(): Promise<string[]> {
    return this._dates;
  }

  // to-do make bbox optional, defaulting to full image
  async getImageUrl(options: Parameters<typeof createGetMapUrl>[2]): Promise<string> {
    return createGetMapUrl(await this.capabilities, [this.id], options)
  }

  async getImage(
    options: Parameters<typeof this.getImageUrl>[0]
  ): Promise<Parameters<typeof this.getImageUrl>[0] & { image: ArrayBuffer }> {
    const url = await this.getImageUrl(options);
    const response = await this._fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    return {
      ...options,
      image: arrayBuffer
    };
  }

  // getFeatureInfo({ x, i, j, y }) {}
}

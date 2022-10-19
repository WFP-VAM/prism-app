import { Layer } from '../layer';

import { createGetMapUrl, findLayer, parseLayerDates } from './utils';

type GetImageOptions = Parameters<typeof createGetMapUrl>[2];

export default class WMSLayer extends Layer {
  private layer: Promise<string>; // xml describing layer from GetCapabilities request
  private dates: Promise<string[]>;

  constructor(options: ConstructorParameters<typeof Layer>[0]) {
    super(options);
    this.layer = this.capabilities.then(xml => findLayer(xml, this.id)!);
    this.dates = this.layer.then(xml => parseLayerDates(xml));
  }

  async getLayerDates(): Promise<string[]> {
    return this.dates;
  }

  // to-do make bbox optional, defaulting to full image
  async getImageUrl(options: GetImageOptions): Promise<string> {
    return createGetMapUrl(await this.capabilities, [this.id], options);
  }

  async getImage(
    options: GetImageOptions,
  ): Promise<GetImageOptions & { image: ArrayBuffer }> {
    const url = await this.getImageUrl(options);
    const response = await this.fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    return {
      ...options,
      image: arrayBuffer,
    };
  }
}

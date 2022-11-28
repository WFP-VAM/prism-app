import { Layer } from "../layer";

import { createGetMapUrl, findLayer, parseLayerDates } from "./utils";

type GetImageOptions = Omit<
  Parameters<typeof createGetMapUrl>[0],
  "capabilities" | "layerIds"
>;

export default class WMSLayer extends Layer {
  private dates: Promise<string[]>;

  constructor(options: ConstructorParameters<typeof Layer>[0]) {
    super(options);

    if (!this.layer) {
      this.layer = this.capabilities.then((xml) => findLayer(xml, this.id)!);
    }

    this.dates = this.layer.then(parseLayerDates);
  }

  async getLayerDates(): Promise<string[]> {
    return this.dates;
  }

  // to-do make bbox optional, defaulting to full image
  async getImageUrl(options: GetImageOptions): Promise<string> {
    return createGetMapUrl({
      ...options,
      capabilities: await this.capabilities,
      layerIds: [this.id],
    });
  }

  async getImage(
    options: GetImageOptions
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

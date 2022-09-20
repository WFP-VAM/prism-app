import { parseName } from "../common";

export class Layer {
  public capabilities: Promise<string>;
  public id: string; // e.g., namespace:feature_type
  public namespace: string | undefined;
  public name: string;

  public _fetch: any;

  constructor({
    capabilities,
    id,
    fetch: _fetch
  }: {
    capabilities: Promise<string>;
    id: string;
    fetch?: any;
  }) {
    this.capabilities = capabilities;
    this.id = id;

    this._fetch = _fetch || fetch;

    const { namespace, short } = parseName(id);
    this.namespace = namespace;
    this.name = short;
  }

  getLayerId(): string {
    throw new Error("not implemented");
  }

  getLayerData(): any {
    throw new Error("not implemented");
  }

  getLayerName(): string {
    throw new Error("not implemented");
  }

  getLayerDescription(): string {
    throw new Error("not implemented");
  }

  async getLayerDates(): Promise<string[]> {
    throw new Error("not implemented");
  }
}

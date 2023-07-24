import { parseName } from "../utils";

export class Layer {
  public capabilities: Promise<string>;
  public debug: boolean | undefined;
  public id: string; // e.g., namespace:feature_type
  public layer: Promise<string> | undefined;
  public namespace: string | undefined;
  public name: string;

  public fetch: any;

  constructor({
    capabilities,
    debug,
    id,
    layer,
    fetch: customFetch,
  }: {
    capabilities: string | Promise<string>;
    debug?: boolean;
    id: string;
    layer?: string;
    fetch?: any;
  }) {
    this.capabilities = Promise.resolve(capabilities);
    this.debug = debug;
    this.id = id;

    if (layer) {
      this.layer = Promise.resolve(layer);
    }

    this.fetch = customFetch || fetch;

    const { namespace, short } = parseName(id);
    this.namespace = namespace;
    this.name = short;
  }
}

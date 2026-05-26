export class LocalError extends Error {
  constructor(public readonly message: string) {
    super(message);
    // We are extending a built-in class

    Object.setPrototypeOf(this, LocalError.prototype);
  }

  getErrorMessage(): string {
    return this.message;
  }
}

export class HTTPError extends Error {
  constructor(
    public readonly message: string,
    public readonly statusCode: number,
  ) {
    super(message);
  }
}

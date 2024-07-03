export class LocalError extends Error {
  constructor(public readonly message: string) {
    super(message);
    // We are extending a built-in class
    // eslint-disable-next-line fp/no-mutating-methods
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
    public readonly detail?: string,
  ) {
    super(message);
    console.error('New HTTP Error: ', { message, statusCode, detail });
  }
}

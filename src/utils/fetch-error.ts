export class FetchError extends Error {
    public readonly status: number;
    public readonly body: unknown;
    public readonly error?: Error;

    public constructor(error?: Error, status: number = 500, body: unknown = {}) {
        super(error?.message)
        Object.setPrototypeOf(this, FetchError.prototype);

        this.name = 'FetchError';
        this.status = status;
        this.body = body;
    }
}
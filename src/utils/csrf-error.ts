export class CsrfError extends Error {
    public readonly code: number;

    public constructor(message?: string, code: number = 301) {
        super(message)
        Object.setPrototypeOf(this, CsrfError.prototype);

        this.name = 'CsrfError';
        this.code = code;
        this.message = "EINVALIDCSRF_" + message;
    }
}
declare module '@socket.io/sticky' {
    export function setupMaster(httpServer: unknown, opts: Record<string, unknown>): void;
    export function setupWorker(io: unknown): void;
};

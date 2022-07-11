import { Request, Response } from "express";
import { Logger } from "winston";

// NOTE: Connect views HERE
export function viewRenderer(_logger: Logger) {
    return (_request: Request, response: Response) => {
        response.send("Hello World!");
    };
}

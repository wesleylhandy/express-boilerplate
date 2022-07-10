import { NextFunction, Request, Response } from "express";

export function subdomainMiddlware(request: Request & { subdomain?: string; }, response: Response, next: NextFunction) {
    if (request.subdomains.length < 0 || request.subdomains.slice(-1)[0] === "www") {
      next();
      return;
    }
    // otherwise we have a subdomain
    request.subdomain = request.subdomains.slice(-1)[0];
    next();
  }
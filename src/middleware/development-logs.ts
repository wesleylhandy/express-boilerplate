import { NextFunction, Request, Response } from "express";

export function developmentLogsMiddleware(isProduction: boolean, workerId: number) {
    return (
        req: Request<unknown, unknown, unknown, unknown> & { session?: unknown, user?: unknown },
        res: Response,
        next: NextFunction,
    ) => {
        if (isProduction) {
            next();
            return;
        }
        console.log("\n*************REQUEST MIDDLEWARE***************\n");
        console.info("IP", req.ip);
        console.info("Path", req.path);
        console.info("Worker", workerId);
        console.info({ subdomain: res.locals.subdomain });
        console.info({'x-auth-token': req.get("x-auth-token")})
        console.info({'x-csrf-jwt': req.get('x-csrf-jwt')})
        console.log("\n*************SESSION MIDDLEWARE***************\n");
        console.info(req.session);
        console.info("\nLogged In: ", typeof req.user !== 'undefined'? 'true': 'false');
        console.log("\n**********************************************\n");
        next();
      }
}
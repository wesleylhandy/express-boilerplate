import { Request, Response } from "express";
import { IUsersDao } from "../../models/i-users-dao";
import { Logger } from "winston";
import { isAbsent } from '@perfective/common'
import { Collections } from "../../contants/collections";

export function handleGetCurrentUser(logger: Logger, usersDAO?: IUsersDao) {
    return async (req: Request<never, unknown, never, { id: string; }>, response: Response) => {
        const { id } = req.query;
        try {
            if (isAbsent(usersDAO)) {
                throw new Error(`Connection to ${Collections.User} collection failed.`)
            }
            if (!usersDAO.validateId(id)) {
                throw new Error(`Invalid User Id`);
            }
            const result = await usersDAO.getUser({ id });

            if (!result.success) {
                throw new Error("Unable to find requested User.");
            }

            response.json(result.value);
        } catch (error) {
            logger.log('error', `GetCurrentUser Error: ${JSON.stringify(error, null, 5)}`)
            response.statusCode = 500;
            response.json({ error });
        }
    }
}
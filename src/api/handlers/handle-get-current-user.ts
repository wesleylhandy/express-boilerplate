import { Request, Response } from "express";
import { IUsersDao } from "../../models/i-users-dao";
import { CurrentUserIdSchema } from "../../utils/schema";
import { Logger } from "winston";
import { isAbsent } from '@perfective/common'

export async function handleGetCurrentUser(logger: Logger, usersDAO?: IUsersDao) {
    return async (req: Request<never, unknown, never, { id: string; }>, res: Response) => {
        const { id } = req.query;
        try {
            const { error } = CurrentUserIdSchema.validate(id);
            if (error) {
                throw new Error(error.details[0].message)
            } 
            if (isAbsent(usersDAO)) {
                throw new Error('Connection to Users collection failed.')
            }
            const profile = await usersDAO.getUser({ id });

            res.json(profile);
        } catch (error) {
            logger.log('error', JSON.stringify(error, null, 5))
            res.statusCode = 500;
            res.json({ error });
        }
    }
}
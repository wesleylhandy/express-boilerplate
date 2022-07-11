import { Request, Response } from "express";
import { IUsersDao } from "../../models/i-users-dao";
import { UserSchema } from "../../utils/schema";
import { Logger } from "winston";
import { isAbsent } from '@perfective/common'
import { signedToken } from "../../utils/sign-token";

export async function handleSignup(logger: Logger, usersDAO?: IUsersDao) {
    return async (request: Request<never, unknown, { username: string; password: string; repeat_password: string }>, response: Response) => {
        try {
            const { username, password, repeat_password } = request.body;
            const { error } = UserSchema.validate({
                username,
                password,
                repeat_password
            });
            if (error) {
                throw new Error(error.details[0].message)
            } 
            if (isAbsent(usersDAO)) {
                throw new Error('Connection to Users collection failed.')
            }
            const result = await usersDAO.addUser(
                username,
                password
            );

            if (!result.success) {
                throw result.error;
            }

            const payload = { user: result.value.id };

            response.json({ isLoggedIn: true, token: signedToken(payload), ...payload });
        } catch (error) {
            logger.log('error', JSON.stringify(error, null, 5))
            response.statusCode = 401;
            response.json({ error, isLoggedIn: false });
        }
    }
}
import { Request, Response } from "express";
import { IUsersDao } from "../../models/i-users-dao";
import { UserSchema } from "../../utils/schema";
import { Logger } from "winston";
import { isAbsent } from '@perfective/common'
import { signedToken } from "src/utils/sign-token";

export async function handleLogin(logger: Logger, usersDAO?: IUsersDao) {
    return async (request: Request<never, unknown, { username: string; password: string; }>, response: Response) => {
        try {
            const { username, password } = request.body;
            const { error } = UserSchema.validate({ username, password });
            if (error) {
                throw new Error(error.details[0].message)
            } 
            if (isAbsent(usersDAO)) {
                throw new Error('Connection to Users collection failed.')
            }
            const result = await usersDAO.getUser({ username });

            if (!result.success) {
                throw new Error("Username does not exist. Please create an account.");
            }
            const { user } = result.value
            const isMatch = await usersDAO.comparePassword(
                password,
                user.password
            );

            if (!isMatch) {
                throw new Error("Username and Password do not match");
            }

            const payload = { user: user.id };

            response.json({ isLoggedIn: true, token: signedToken(payload), ...payload });
        } catch (error) {
            logger.log('error', JSON.stringify(error, null, 5))
            response.statusCode = 401;
            response.json({ error, isLoggedIn: false });
        }
    }
}
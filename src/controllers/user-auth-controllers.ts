import { Express, Router, Request, RequestHandler } from "express";
import jwt, { SignOptions } from "jsonwebtoken";
import { UserSchema } from "../utils/schema";
import { ApiVersions } from "../contants/api-versions";
import { Logger } from "winston";
import { IUsersDao } from "../models/i-users-dao";

// TODO: Refactor to be less dependent on props
// TODO: Refactor into routes and handlers
// TODO: Add req params, body, query validation
export const userAuthController = async (
  app: Express,
  extendedUrlParser: RequestHandler,
  usersDAO: IUsersDao,
  logger: Logger,
) => {
  const router = Router();
  router.get(
    "/current-user",
    extendedUrlParser,
    async (req: Request<never, unknown, never, { id: string; }>, res) => {
      const { id } = req.query;
      try {
        const profile = await usersDAO.getUser({ id });
        res.json(profile);
      } catch (error) {
        logger.log('error', JSON.stringify(error, null, 5))
        res.statusCode = 500;
        res.json({ error });
      }
    });

  router.post(
    "/login",
    extendedUrlParser,
    async (req: Request<never, unknown, { username: string; password: string; }>, res) => {
      const { username, password } = req.body;
      const { error, value } = UserSchema.validate({ username, password });
      if (error) {
        logger.error(error);
        res.statusCode = 401;
        res.json({ message: error.details[0].message, isLoggedIn: false });
      } else {
        try {
          const response = await usersDAO.getUser({ username });
          if (response.success) {
            const { user } = response.value
            const isMatch = await usersDAO.comparePassword(
              password,
              user.password
            );
            if (isMatch) {
              const payload = { user: user.id };
              const options: SignOptions = { expiresIn: "2d", algorithm: "HS512" };
              const secret = process.env.JWT_SECRET;
              const token = jwt.sign(payload, secret ?? 'uh-oh!!!', options);
              res.json({ isLoggedIn: true, token, user: user.id });
            } else {
              throw new Error("Username and Password do not match");
            }
          } else {
            throw new Error(
              "Username does not exist. Please create an account."
            );
          }
        } catch (error) {
          logger.log('error', JSON.stringify(error, null, 5))
          res.statusCode = 401;
          res.json({ error, isLoggedIn: false });
        }
      }
    });

  router.post("/logout", (_req, res) => {
    res.json({ isLoggedIn: false, token: "", user: "" });
  });

  router.post(
    "/signup",
    extendedUrlParser,
    async (req: Request<never, unknown, { username: string; password: string; repeat_password: string }>, res) => {
      const { username, password, repeat_password } = req.body;
      const { error, value } = UserSchema.validate({
        username,
        password,
        repeat_password
      });
      if (error) {
        logger.error(error)
        res.statusCode = 401;
        res.json({ message: error.details[0].message, isLoggedIn: false });
      } else {
        try {
          const response = await usersDAO.addUser(
            username,
            password
          );
          if (response.success) {
            // TODO: Extract Token logic and make more secure
            const payload = { user: response.value.id };
            const options: SignOptions = { expiresIn: "2d", algorithm: "HS512" };
            const secret = process.env.JWT_SECRET;
            const token = jwt.sign(payload, secret ?? 'uh-oh!!!', options);
            res.json({ isLoggedIn: true, token, user: response.value.id });
          } else {
            throw response.error;
          }
        } catch (error: unknown) {
          logger.log('error', JSON.stringify(error, null, 5))
          res.statusCode = 401;
          res.json({ error, isLoggedIn: false });
        }
      }
    });

  app.use(`/api/${ApiVersions.Users}/users/auth`, router);
};

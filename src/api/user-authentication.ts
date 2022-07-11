import { Router, RequestHandler } from "express";
import { ApiVersions } from "../contants/api-versions";
import { Logger } from "winston";
import { extendedUrlParser } from "../middleware/body-parser";
import { UserController } from "../controllers/user-controller";
import { handleLogin } from "./handlers/handle-login";
import { handleGetCurrentUser } from "./handlers/handle-get-current-user";
import { handleSignup } from "./handlers/handle-signup";
import { Collections } from "../contants/collections";

export function configureUserAuthenticationRoutes(
  workerId: number,
  logger: Logger,
): [string, Router] {
  const usersController = new UserController(logger, workerId);

  // TODO: Develop some sort of Queue for handling Process messages
  process.on("message", async message => {
    if (message === "Process.Closing") {
      try {
        await usersController.connection?.close();
        if (typeof process.send === 'function') {
          process.send("DB.Closed");
        }
      } catch (error) {
        logger.log('error', `${Collections.User} Failed to Close: ${JSON.stringify(error, null, 5)}`)
      }
    }
  });

  const router = Router();

  router.get(
    "/current-user",
    extendedUrlParser,
    handleGetCurrentUser(logger, usersController.usersDao) as unknown as RequestHandler
  );

  router.post(
    "/login",
    extendedUrlParser,
    handleLogin(logger, usersController.usersDao) as unknown as RequestHandler
  );

  router.post("/logout", (_req, res) => {
    res.json({ isLoggedIn: false, token: "", user: "" });
  });

  router.post(
    "/signup",
    extendedUrlParser,
    handleSignup(logger, usersController.usersDao) as unknown as RequestHandler
  );

  return [`/api/${ApiVersions.Users}/users/auth`, router];
};

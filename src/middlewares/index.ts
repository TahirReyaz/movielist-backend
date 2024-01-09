import express from "express";

import lodash from "lodash";

import { getUserBySessionToken } from "../db/users.js";
import { AUTH_COOKIE_NAME } from "../controllers/authentication.js";

export const isAuthenticated = async (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  try {
    const sessionToken = req.cookies[AUTH_COOKIE_NAME];

    if (!sessionToken) {
      return res.status(400).send({ message: "Not logged in" });
    }

    const existingUser = await getUserBySessionToken(sessionToken);

    if (!existingUser) {
      return res.status(403).send({ message: "Forbidden! user doesn't exist" });
    }

    lodash.merge(req, { identity: existingUser });

    return next();
  } catch (error) {
    console.log(error);
    return res.sendStatus(400);
  }
};

export const isOwner = async (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  try {
    let id = req.params.id;
    if (!id) {
      id = req.body.userid;
    }
    const currentUserId = lodash.get(req, "identity._id") as string;

    if (currentUserId.toString() != id) {
      return res.status(400).send({
        message: "You are not the owner",
      });
    }

    next();
  } catch (error) {
    console.log(error);
    return res.sendStatus(400);
  }
};

export const isOwnList = async (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  try {
    const { userid } = req.body;
    if (!userid) {
      return res.status(400).send({
        message: "Missing field: userid",
      });
    }
    const currentUserId = lodash.get(req, "identity._id") as string;

    if (currentUserId.toString() != userid) {
      return res.status(400).send({
        message: "Not own list",
      });
    }

    next();
  } catch (error) {
    console.log(error);
    return res.sendStatus(400);
  }
};

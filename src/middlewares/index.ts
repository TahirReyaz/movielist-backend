import express from "express";
import mongoose from "mongoose";
import lodash from "lodash";

import {
  getUserById,
  getUserBySessionToken,
  getUserByUsername,
} from "../db/users";
import { AUTH_COOKIE_NAME } from "../controllers/authentication";
import { getEntryById } from "../db/listEntries";
import { getActivityById } from "../db/activities";
import { getNotificationById } from "../db/notifications";
import { getCommentById } from "../db/comments";
import { authentication } from "../helpers";

export const isAuthenticated = async (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  try {
    const sessionToken = req.cookies[AUTH_COOKIE_NAME];

    if (!sessionToken) {
      return res.status(401).send({ message: "Not logged in" });
    }

    const existingUser = await getUserBySessionToken(sessionToken);

    if (!existingUser) {
      return res.status(401).send({ message: "Forbidden! user doesn't exist" });
    }

    lodash.merge(req, { identity: existingUser });

    return next();
  } catch (error) {
    console.error(error);
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
    console.error(error);
    return res.sendStatus(400);
  }
};

export const isOwnEntry = async (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  try {
    const { entryid } = req.params;

    const currentUserId = lodash.get(
      req,
      "identity._id"
    ) as mongoose.Types.ObjectId;

    const currentEntry = await getEntryById(entryid);

    if (!currentEntry) {
      return res.status(404).send({ message: "Entry not found" });
    }

    if (!currentUserId.equals(currentEntry.owner)) {
      return res.status(401).send({
        message: "Not own entry",
      });
    }

    next();
  } catch (error) {
    console.error(error);
    return res.sendStatus(400);
  }
};

export const paramActivityExists = async (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  try {
    const { activityId } = req.params;

    const activity = await getActivityById(activityId);

    if (!activity) {
      return res.status(404).send({ message: "Activity not found" });
    }

    next();
  } catch (error) {
    console.error(error);
    return res.sendStatus(400);
  }
};

export const paramCommentExists = async (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  try {
    const { commentId } = req.params;

    const activity = await getCommentById(commentId);

    if (!activity) {
      return res.status(404).send({ message: "Comment not found" });
    }

    next();
  } catch (error) {
    console.error(error);
    return res.sendStatus(500);
  }
};

export const isOwnActivity = async (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  try {
    const { id } = req.params;

    const currentUserId = lodash.get(
      req,
      "identity._id"
    ) as mongoose.Types.ObjectId;

    const currentActivity = await getActivityById(id);

    if (!currentActivity) {
      return res.status(404).send({ message: "Activity not found" });
    }

    if (!currentUserId.equals(currentActivity.owner._id)) {
      return res.status(401).send({
        message: "Not own Activity",
      });
    }

    next();
  } catch (error) {
    console.error(error);
    return res.sendStatus(400);
  }
};

export const isOwnNotif = async (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  try {
    const { id } = req.params;

    const currentUserId = lodash.get(
      req,
      "identity._id"
    ) as mongoose.Types.ObjectId;

    const currentNotif = await getNotificationById(id);

    if (!currentNotif) {
      return res.status(404).send({ message: "Notification not found" });
    }

    if (!currentUserId.equals(currentNotif.owner)) {
      return res.status(401).send({
        message: "Not own Notification",
      });
    }

    next();
  } catch (error) {
    console.error(error);
    return res.sendStatus(400);
  }
};

export const isPasswordCorrect = async (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  try {
    const { password } = req.body;
    const userid = lodash.get(req, "identity._id") as mongoose.Types.ObjectId;

    if (!password) {
      return res.status(400).send({ message: "Missing Password" });
    }

    const user = await getUserById(userid.toString()).select(
      "+authentication.salt +authentication.password"
    );

    const expectedHash = authentication(user.authentication.salt, password);

    if (user.authentication.password != expectedHash) {
      return res.status(403).send({ message: "Wrong Password" });
    }

    next();
  } catch (error) {
    console.error(error);
    return res.sendStatus(400);
  }
};

export const isUserExists = async (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  try {
    let { username } = req.params;
    if (!username) {
      return res.status(400).send("Provide the username");
    }

    const user = await getUserByUsername(username);

    if (!user) {
      return res.status(404).send("User not found");
    }

    lodash.merge(req, { identity: user });

    next();
  } catch (error) {
    console.error(error);
    return res.sendStatus(400);
  }
};

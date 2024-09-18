import express from "express";
import lodash from "lodash";
import mongoose from "mongoose";

import {
  createUser,
  getUserByEmail,
  getUserById,
  getUserBySessionToken,
  getUserByUsername,
} from "../db/users";
import { authentication, checkWhitespace, random } from "../helpers";
import { DEFAULT_AVATAR_URL } from "../constants/misc";
import { NotificationModel } from "../db/notifications";
import { ListEntryModel } from "../db/listEntries";
import { passwordValidity } from "../helpers/auth";

export const AUTH_COOKIE_NAME = "MOVIELIST-AUTH";

export const login = async (req: express.Request, res: express.Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).send({ message: "Missing Fields" });
    }

    const user = await getUserByEmail(email).select(
      "+authentication.salt +authentication.password"
    );
    if (!user) {
      return res.status(400).send({ message: "User not found" });
    }

    const expectedHash = authentication(user.authentication.salt, password);

    if (user.authentication.password != expectedHash) {
      console.error("Wrong password");
      return res.status(403).send({ message: "Wrong Password" });
    }

    const salt = random();
    // updating session token
    user.authentication.sessionToken = authentication(
      salt,
      user._id.toString()
    );

    await user.save();

    // set the cookie
    res.cookie(AUTH_COOKIE_NAME, user.authentication.sessionToken, {
      // domain: FRONTEND_DOMAIN,
      path: "/",
      sameSite: "none",
      secure: true,
    });

    const unreadNotificationCount = await NotificationModel.countDocuments({
      owner: user._id,
      read: false,
    });

    return res
      .status(200)
      .json({
        ...user.toObject(),
        message: "Successfully logged in",
        token: user.authentication.sessionToken,
        unreadNotifs: unreadNotificationCount,
      })
      .end();
  } catch (error) {
    console.error(error);
    return res.status(500).send({ message: "Error loggin in" });
  }
};

export const loginUsingToken = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const { sessionToken } = req.body;

    const user = await getUserBySessionToken(sessionToken);

    if (!user) {
      return res.status(401).send({ message: "Forbidden! token not valid" });
    }

    // Populate user with other data
    const [tvEntries, movieEntries] = await Promise.all([
      ListEntryModel.find({ owner: user._id, mediaType: "tv" }),
      ListEntryModel.find({ owner: user._id, mediaType: "movie" }),
    ]);

    const userWithEntries = {
      ...user.toObject(),
      entries: {
        tv: tvEntries.map((entry) => ({
          _id: entry._id,
          mediaid: entry.mediaid,
          status: entry.status,
        })),
        movie: movieEntries.map((entry) => ({
          _id: entry._id,
          mediaid: entry.mediaid,
          status: entry.status,
        })),
      },
    };

    const unreadNotificationCount = await NotificationModel.countDocuments({
      owner: user._id,
      read: false,
    });

    // set the cookie
    res.cookie(AUTH_COOKIE_NAME, sessionToken, {
      path: "/",
      sameSite: "none",
      secure: true,
    });

    return res
      .status(200)
      .json({
        ...userWithEntries,
        message: "Successfully logged in",
        token: sessionToken,
        unreadNotifs: unreadNotificationCount,
      })
      .end();
  } catch (error) {
    console.error(error);
    return res.status(500).send({ message: "Error loggin in" });
  }
};

export const register = async (req: express.Request, res: express.Response) => {
  try {
    const { email, password, username } = req.body;

    if (!email || !password || !username) {
      return res.sendStatus(400);
    }

    if (checkWhitespace(username)) {
      return res
        .status(400)
        .send({ message: "Username must not contain whitespace" });
    }

    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      return res.status(400).send({ message: "User Already Exists!" });
    }

    const salt = random();
    const user = await createUser({
      email,
      username,
      authentication: {
        salt,
        password: authentication(salt, password),
      },
      following: [],
      followers: [],
      avatar: DEFAULT_AVATAR_URL,
    });

    return res
      .status(200)
      .json({ ...user, message: "Successfully registered" })
      .end();
  } catch (error) {
    console.error(error);
    return res.status(500).send({ message: "Error while registering" });
  }
};

export const changePassword = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const { newPassword, oldPassword } = req.body;
    const userid = lodash.get(req, "identity._id") as mongoose.Types.ObjectId;

    if (!newPassword) {
      return res.status(400).send({ message: "Missing Password" });
    }

    if (!passwordValidity(newPassword)) {
      return res.status(400).send({ message: "Wrong Password Format" });
    }

    const user = await getUserById(userid.toString()).select(
      "+authentication.salt +authentication.password"
    );

    const expectedOldHash = authentication(
      user.authentication.salt,
      oldPassword
    );
    const expectedNewHash = authentication(
      user.authentication.salt,
      newPassword
    );

    if (user.authentication.password !== expectedOldHash) {
      return res.status(403).send({ message: "Wrong Password" });
    }

    if (expectedNewHash === expectedOldHash) {
      return res
        .status(400)
        .send({ message: "New Password can not be same as the old one" });
    }

    // save new password in db
    const salt = random();
    user.authentication.salt = salt;
    user.authentication.password = authentication(salt, newPassword);
    await user.save();

    return res
      .status(200)
      .send({ message: "Changed Password successfully" })
      .end();
  } catch (error) {
    console.error(error);
    return res.status(500).send({ message: "Server error" });
  }
};

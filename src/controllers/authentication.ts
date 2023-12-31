import express from "express";

import { createUser, getUserByEmail } from "../db/users.js";
import { authentication, random } from "../helpers/index.js";

export const login = async (req: express.Request, res: express.Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.sendStatus(400);
    }

    const user = await getUserByEmail(email).select(
      "+authentication.salt +authentication.password"
    );
    if (!user) {
      console.log("User not found");
      return res.status(400).send({ message: "User not found" });
    }

    const expectedHash = authentication(user.authentication.salt, password);

    if (user.authentication.password != expectedHash) {
      console.log("Wrong password");
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
    res.cookie("MOVIELIST-AUTH", user.authentication.sessionToken, {
      domain: "localhost",
      path: "/",
    });

    return res
      .status(200)
      .json({ ...user, message: "Successfully logged in" })
      .end();
  } catch (error) {
    console.log(error);
    return res.status(400).send({ message: "Error loggin in" });
  }
};

export const register = async (req: express.Request, res: express.Response) => {
  try {
    const { email, password, username } = req.body;

    if (!email || !password || !username) {
      return res.sendStatus(400);
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
    });

    return res
      .status(200)
      .json({ ...user, message: "Successfully registered" })
      .end();
  } catch (error) {
    console.log(error);
    return res.status(400).send({ message: "Error while registering" });
  }
};

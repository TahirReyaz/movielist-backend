import lodash from "lodash";
import express from "express";
import mongoose from "mongoose";

import { getUserById, getUserByUsername } from "../db/users";
import { createNotification } from "../db/notifications";
import { DEFAULT_AVATAR_URL } from "../constants/misc";
import {
  createNewFollower,
  getFollower,
  getFollowers,
  removeFollower,
} from "../db/followers";

// TODO: When delete user is called, delete the user from follower table too
export const followUser = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const userid = lodash.get(req, "identity._id") as mongoose.Types.ObjectId;
    const { username: targetUsername } = req.params;

    const user = await getUserById(userid.toString());
    const target = await getUserByUsername(targetUsername);

    // If the user with this id doesn't exist
    if (!target) {
      return res.status(404).send({ message: "User not found" });
    }

    const targetId = target._id;

    if (await getFollower({ user: userid, target: targetId })) {
      return res.status(400).send({ message: "Already following" });
    }

    const newFollower = await createNewFollower(
      userid.toString(),
      targetId.toString()
    );

    // Create Notification
    await createNotification({
      type: "follows",
      content: "started following you",
      pointingImg: user.avatar ?? DEFAULT_AVATAR_URL,
      pointingId: user.username,
      pointingType: "user",
      owner: target._id,
    });

    return res.status(200).json(newFollower).end();
  } catch (error) {
    console.error(error);
    return res.status(500).send({ message: "Some error occurred" });
  }
};

export const unfollowUser = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const userid = lodash.get(req, "identity._id") as mongoose.Types.ObjectId;
    const { username: targetUsername } = req.params;

    const user = await getUserById(userid.toString());
    const target = await getUserByUsername(targetUsername);

    // If the user with this id doesn't exist
    if (!user || !target) {
      return res.status(404).send({ message: "User not found" });
    }

    const targetId = target._id;

    if (!getFollower({ user: userid, target: targetId })) {
      return res.status(400).send({ message: "Not following already" });
    }

    await removeFollower(userid, targetId);

    return res.status(200).json(user).end();
  } catch (error) {
    console.error(error);
    return res.status(500).send({ message: "Some error occurred" });
  }
};

export const getUserFollowers = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const userid = lodash.get(req, "identity._id") as mongoose.Types.ObjectId;

    const followers = await getFollowers({ target: userid });

    return res.status(200).json(followers).end();
  } catch (error) {
    console.error(error);
    return res.status(500).send({ message: "Some error occurred" });
  }
};

export const getUserFollowings = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const userid = lodash.get(req, "identity._id") as mongoose.Types.ObjectId;

    const followers = await getFollowers({ user: userid });

    return res.status(200).json(followers).end();
  } catch (error) {
    console.error(error);
    return res.status(500).send({ message: "Some error occurred" });
  }
};

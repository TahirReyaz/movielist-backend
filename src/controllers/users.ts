import express from "express";
import lodash from "lodash";
import mongoose from "mongoose";

import {
  deleteUserById,
  getUserById,
  getUserByUsername,
  getUsers,
} from "../db/users";
import { deleteEntriesByUserid } from "../db/listEntries";

interface idsString {
  ids: string;
}

export const getAllUsers = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const users = await getUsers();

    return res.status(200).json(users);
  } catch (error) {
    console.error(error);
    return res.sendStatus(400);
  }
};

export const getBulkUsers = async (
  req: express.Request<{}, {}, {}, idsString>,
  res: express.Response
) => {
  try {
    const { ids } = req.query;
    const idArray = ids.split(",");

    const users = await getUsers();

    return res
      .status(200)
      .json(users.filter((user) => idArray.includes(user._id.toString())));
  } catch (error) {
    console.error(error);
    return res.sendStatus(400);
  }
};

export const getProfile = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const { username } = req.params;
    const user = await getUserByUsername(username);
    if (!user) {
      return res
        .status(400)
        .send({ message: "User with this username not found" });
    }

    return res.status(200).json(user);
  } catch (error) {
    console.error(error);
    return res.status(400).send({ message: "Some error occurred" });
  }
};

export const deleteUser = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const userid = lodash.get(req, "identity._id") as mongoose.Types.ObjectId;

    // First delete the associated entries
    await deleteEntriesByUserid(userid);

    // Then delete the user
    const deletedUser = await deleteUserById(userid);

    return res.json(deletedUser);
  } catch (error) {
    console.error(error);
    return res.sendStatus(400);
  }
};

export const updateUser = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const { id } = req.params;

    const user = await getUserById(id);

    // If the user with this id doesn't exist
    if (!user) {
      return res.status(400).send({ message: "User not found" });
    }

    for (const key in req.body) {
      if (req.body[key]) {
        user.set(key, req.body[key]);
      }
    }
    await user.save();

    return res.status(200).json(user).end();
  } catch (error) {
    console.error(error);
    return res.sendStatus(400);
  }
};

// When delete user is called, remove this user from the follower list of other users
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
    if (!user || !target) {
      return res.status(400).send({ message: "User not found" });
    }

    const targetId = target._id;

    if (user.following.includes(targetId)) {
      return res.status(400).send({ message: "Already following" });
    }
    user.following.push(targetId);
    await user.save();
    target.followers.push(userid);
    await target.save();

    return res.status(200).json(user).end();
  } catch (error) {
    console.error(error);
    return res.status(400).send({ message: "Some error occurred" });
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
      return res.status(400).send({ message: "User not found" });
    }

    const targetId = target._id;

    if (!user.following.includes(targetId)) {
      return res.status(400).send({ message: "Not following already" });
    }

    // Remove the targetId from the following array
    user.following = user.following.filter(
      (id: mongoose.Types.ObjectId) => !id.equals(targetId)
    );
    await user.save();

    // Also remove the userid from the target's followers array
    target.followers = target.followers.filter(
      (id: mongoose.Types.ObjectId) => !id.equals(userid)
    );
    await target.save();

    return res.status(200).json(user).end();
  } catch (error) {
    console.error(error);
    return res.status(400).send({ message: "Some error occurred" });
  }
};

export const toggleFav = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const userid = lodash.get(req, "identity._id") as mongoose.Types.ObjectId;

    const { entityId, entityType, fav } = req.body;

    const user = await getUserById(userid.toString());

    // If the user with this id doesn't exist
    if (!user) {
      return res.status(404).send({ message: "User not found" });
    }

    const favs = user.fav;
    if (fav) {
      favs[entityType as keyof typeof favs].push(entityId);
    } else {
      favs[entityType as keyof typeof favs] = favs[
        entityType as keyof typeof favs
      ].filter((id) => id !== entityId);
    }

    user.set("fav", favs);
    await user.save();

    return res.status(200).json(user).end();
  } catch (error) {
    console.error(error);
    return res.status(400).send({ message: "Some error occurred" });
  }
};

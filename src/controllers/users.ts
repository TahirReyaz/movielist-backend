import express from "express";

import {
  deleteUserById,
  getUserById,
  getUserByUsername,
  getUsers,
} from "../db/users";
import { deleteListById } from "../db/lists";

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
    const users = await getUserByUsername(username);

    return res.status(200).json(users);
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
    const { id } = req.params;

    // First delete the associated lists
    const { lists } = await getUserById(id);
    lists.forEach(async (list) => {
      await deleteListById(list.id);
    });
    // Then delete the user
    const deletedUser = await deleteUserById(id);

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
    const { userid } = req.body;
    const { targetId } = req.params;

    const user = await getUserById(userid);
    const target = await getUserById(targetId);

    // If the user with this id doesn't exist
    if (!user || !target) {
      return res.status(400).send({ message: "User not found" });
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

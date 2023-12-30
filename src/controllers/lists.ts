import express from "express";

import {
  List,
  createNewList,
  deleteListById,
  getListById,
  getLists,
} from "../db/lists.js";
import { getUserById } from "../db/users.js";

export const getAllLists = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const lists = await getLists();

    return res.status(200).json(lists);
  } catch (error) {
    console.log(error);
    return res.sendStatus(400);
  }
};

export const getList = async (req: express.Request, res: express.Response) => {
  try {
    const { id } = req.params;
    const list = await getListById(id);

    return res.status(200).json(list);
  } catch (error) {
    console.log(error);
    return res.sendStatus(400);
  }
};

export const deleteList = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const { id } = req.params;

    const deletedList = await deleteListById(id);

    return res.json(deletedList);
  } catch (error) {
    console.log(error);
    return res.sendStatus(400);
  }
};

export const updateList = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const { listid } = req.params;

    const list = await getListById(listid);

    // If the user with this id doesn't exist
    if (!list) {
      return res.status(400).send({ message: "List not found" });
    }

    for (const key in req.body) {
      if (req.body[key]) {
        list.set(key, req.body[key]);
      }
    }
    await list.save();

    return res.status(200).json(list).end();
  } catch (error) {
    console.log(error);
    return res.sendStatus(400);
  }
};

export const createList = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const { type, items, userid, mediatype } = req.body;

    if (!type || !userid || !mediatype || !items || items.length == 0) {
      return res.status(400).send({ message: "Missing Fields" });
    }

    const user = await getUserById(userid);
    if (!user) {
      return res.status(400).send({ message: "User Not Found" });
    }

    if (user.lists && user.lists.length > 0) {
      const existingList = user.lists.find((list) => list.listtype == type);
      if (existingList) {
        return res.status(400).send({ message: "List already exists" });
      }
    }

    const list = await createNewList({ type, items, userid, mediatype });

    // add the list in the user
    user.lists.push({ id: list._id.toString(), listtype: type });
    await user.save();

    return res.status(200).json(list).end();
  } catch (error) {
    console.log(error);
    return res.status(400).send({ message: "Some Error Occurred" });
  }
};

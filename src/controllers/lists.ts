import express from "express";

import {
  createNewList,
  deleteListById,
  getListById,
  getLists,
} from "../db/lists.js";
import { getUserById, removeListItem } from "../db/users.js";

type userListItem = {
  listtype: string;
  id: string;
};

export const getAllLists = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const lists = await getLists();

    return res.status(200).json(lists);
  } catch (error) {
    console.error(error);
    return res.sendStatus(400);
  }
};

export const getList = async (req: express.Request, res: express.Response) => {
  try {
    const { id } = req.params;
    const list = await getListById(id);

    return res.status(200).json(list);
  } catch (error) {
    console.error(error);
    return res.sendStatus(400);
  }
};

export const deleteList = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const { listid } = req.params;

    const list = await getListById(listid);
    if (!list) {
      return res.status(400).send({ message: "List not found" });
    }

    // If there are entries, delete them too
    // Use some deleteMany function

    // Remove the list from the user too
    const user = await getUserById(list.userid);
    if (!user) {
      return res.status(400).send({ message: "Corresponding user not found" });
    }

    await removeListItem(listid, list.userid);

    const deletedList = await deleteListById(listid);

    return res.json(deletedList);
  } catch (error) {
    console.error(error);
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
    console.error(error);
    return res.sendStatus(400);
  }
};

/////////////////////////////////Deprecated/////////////////////////////////
export const createList = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const { type, items, userid, mediatype } = req.body;

    if (!type || !userid || !mediatype || !items) {
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
    console.error(error);
    return res.status(400).send({ message: "Some Error Occurred" });
  }
};

export const addListItem = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const { listtype, mediaid, userid, mediatype } = req.body;

    if (!listtype || !userid || !mediatype || !mediaid) {
      return res.status(400).send({ message: "Missing Fields" });
    }

    const user = await getUserById(userid);
    if (!user) {
      return res.status(400).send({ message: "User Not Found" });
    }

    // If list already exists
    if (user.lists && user.lists.length > 0) {
      const existingListIndex = user.lists.findIndex(
        (list) => list.listtype == listtype
      );
      if (existingListIndex != -1) {
        const existingList = await getListById(
          user.lists[existingListIndex].id
        );
        // If the item already exists
        const existingItem = existingList.items.includes(mediaid);
        if (existingItem) {
          return res
            .status(400)
            .send({ message: "Item already exists in the list" });
        }
        // If item doesn't exist already
        existingList.items.push(mediaid);
        const updatedList = await existingList.save();
        return res
          .status(200)
          .json({ ...updatedList, message: `Added to ${listtype} list` })
          .end();
      }
    }

    // If list doesn't exist already
    const list = await createNewList({
      type: listtype,
      items: [mediaid],
      userid,
      mediatype,
    });

    // add the list in the user
    user.lists.push({ id: list._id.toString(), listtype });
    await user.save();

    return res.status(200).json(list).end();
  } catch (error) {
    console.error(error);
    return res.status(400).send({ message: "Some Error Occurred" });
  }
};

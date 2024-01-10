import express from "express";

import {
  createNewEntry,
  deleteEntryById,
  getEntries,
  getEntryById,
} from "../db/listEntries.js";
import { createNewList, getListById } from "../db/lists.js";
import { getUserById } from "../db/users.js";

export const getAllListEntries = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const entries = await getEntries();

    return res.status(200).json(entries);
  } catch (error) {
    console.error(error);
    return res.status(400).send({ message: "Database error" });
  }
};

export const getEntry = async (req: express.Request, res: express.Response) => {
  try {
    const { id } = req.params;
    const entry = await getEntryById(id);

    return res.status(200).json(entry);
  } catch (error) {
    console.error(error);
    return res.status(400).send({ message: "Databse error" });
  }
};

export const deleteEntry = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const { entryid } = req.params;

    const deletedEntry = await deleteEntryById(entryid);

    return res.json(deletedEntry);
  } catch (error) {
    console.error(error);
    return res.status(400).send({ message: "Database error" });
  }
};

export const updateListEntry = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const { entryid } = req.params;

    const entry = await getEntryById(entryid);

    // If the entry with this id doesn't exist
    if (!entry) {
      return res.status(400).send({ message: "List entry not found" });
    }

    // Check if the list is changing or not

    for (const key in req.body) {
      if (req.body[key]) {
        entry.set(key, req.body[key]);
      }
    }
    await entry.save();

    return res.status(200).json(entry).end();
  } catch (error) {
    console.error(error);
    return res.status(400).send({ message: "Database error" });
  }
};

export const createListEntry = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const {
      mediaid,
      userid,
      listid,
      mediatype,
      status,
      startDate,
      endDate,
      fav,
      progress,
      rewatches,
      score,
      notes,
      title,
      poster,
      backdrop,
    } = req.body;

    if (!userid || !mediaid || !status) {
      return res.status(400).send({ message: "Missing Fields" });
    }

    const user = await getUserById(userid);
    if (!user) {
      return res.status(400).send({ message: "User Not Found" });
    }

    let list;
    // Create list if not provided
    if (!listid) {
      // Check if list already exists on the user or not
      let existingList;
      if (user.lists && user.lists.length > 0) {
        existingList = user.lists.find((list) => list.listtype == status);
        list = await getListById(existingList.id);
      }
      if (!existingList) {
        const newList = await createNewList({
          status,
          userid,
          items: [],
          mediatype,
        });

        list = await getListById(newList._id.toString());

        // add the list in the user
        user.lists.push({ id: newList._id.toString(), listtype: status });
        await user.save();
      }
    } else {
      list = await getListById(listid);
    }

    const entry = await createNewEntry({
      mediaid,
      userid,
      listid: listid ? listid : list._id,
      status,
      startDate,
      endDate,
      fav,
      progress,
      rewatches,
      score,
      notes,
      title,
      poster,
      backdrop,
    });

    // Add entry to the list
    list.items.push(entry._id.toString());
    await list.save();

    return res.status(200).json(entry).end();
  } catch (error) {
    console.error(error);
    return res.status(400).send({ message: "Some Error Occurred" });
  }
};

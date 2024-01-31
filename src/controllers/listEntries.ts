import express from "express";

import {
  ListEntry,
  createNewEntry,
  deleteEntryById,
  getEntries,
  getEntriesByUserId,
  getEntryById,
} from "../db/listEntries";
import { getUserById, removeEntryItem } from "../db/users";

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

    const entry = await getEntryById(entryid);
    if (!entry) {
      return res.status(400).send({ message: "Entry not found" });
    }

    // Remove the entry from the list too
    const user = await getUserById(entry.userid);
    if (!user) {
      return res.status(400).send({ message: "Corresponding user not found" });
    }

    await removeEntryItem(entryid, user._id.toString());

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
      mediaType,
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

    if (
      !userid ||
      !mediaid ||
      !status ||
      !mediaType ||
      !title ||
      !poster ||
      !backdrop
    ) {
      console.log({
        mediaid,
        userid,
        mediaType,
        status,
        title,
        poster,
        backdrop,
      });
      return res.status(400).send({ message: "Missing Fields" });
    }

    // Check if this entry already exists
    const userEntries = await getEntriesByUserId(userid);
    const existingEntry = userEntries.find(
      (entry: ListEntry) => entry.mediaid === mediaid
    );
    if (existingEntry) {
      if (existingEntry.status === status) {
        return res.status(400).send({
          message: "Entry with the same media id and status already exists",
        });
      }

      const updatedEntry = await getEntryById(existingEntry.id);
      updatedEntry.status = status;
      await updatedEntry.save();

      return res.status(200).json(updatedEntry).end();
    }

    const user = await getUserById(userid);
    if (!user) {
      return res.status(400).send({ message: "User Not Found" });
    }

    const entry = await createNewEntry({
      mediaType,
      mediaid,
      userid,
      status,
      startDate,
      endDate,
      fav: fav ? fav : false,
      progress: progress ? progress : 0,
      rewatches: rewatches ? rewatches : 0,
      score,
      notes,
      title,
      poster,
      backdrop,
    });

    // Add entry to the list
    user.entries.push({ id: entry._id.toString(), status, mediaType, mediaid });
    await user.save();

    return res.status(200).json(entry).end();
  } catch (error) {
    console.error(error);
    return res.status(400).send({ message: "Some Error Occurred" });
  }
};

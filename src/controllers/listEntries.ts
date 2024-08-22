import express from "express";
import axios from "axios";
import lodash from "lodash";

import {
  ListEntry,
  createNewEntry,
  deleteEntryById,
  getEntries,
  getEntriesByUserId,
  getEntryById,
} from "../db/listEntries";
import { getUserById, removeEntryItem, updateEntryItem } from "../db/users";
import {
  MediaStatus,
  MediaType,
  TMDB_API_KEY,
  TMDB_ENDPOINT,
} from "../constants/misc";
import { EntryDocument } from "../helpers/stats";
import { createNewActivity } from "../helpers/activity";

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
    const { userid, status } = req.body;
    if (!userid || !status) {
      console.error({
        mediaid: req.body.mediaid,
        userid: req.body.userid,
        mediaType: req.body.mediaType,
        status: req.body.status,
        title: req.body.title,
        poster: req.body.poster,
      });
      return res.status(400).send({ message: "Missing Fields" });
    }

    const { entryid } = req.params;

    const entry: EntryDocument = await getEntryById(entryid);

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

    const { data: mediaData } = await axios.get(
      `${TMDB_ENDPOINT}/${entry.mediaType}/${entry.mediaid}`,
      {
        params: {
          api_key: TMDB_API_KEY,
        },
      }
    );
    const { data: tagResult } = await axios.get(
      `${TMDB_ENDPOINT}/${entry.mediaType}/${entry.mediaid}/keywords`,
      {
        params: {
          api_key: TMDB_API_KEY,
        },
      }
    );
    const tagData =
      entry.mediaType == "tv" ? tagResult?.results : tagResult?.keywords;
    mediaData.tags = tagData;
    entry.data = mediaData;

    // Add start and end date if not present and required
    if (status == MediaStatus.completed) {
      if (!entry.startDate) {
        entry.startDate = new Date().toISOString();
      }
      if (!entry.endDate) {
        entry.endDate = new Date().toISOString();
      }
    } else if (status == MediaStatus.watching) {
      if (!entry.startDate) {
        entry.startDate = new Date().toISOString();
      }
    }

    await entry.save();

    // Create activity
    await createNewActivity({
      userid,
      status,
      title: entry.title,
      poster: entry.poster,
      mediaid: parseInt(entry.mediaid),
      mediaType: entry.mediaType,
      type: "media",
    });

    // Add entry to the user
    await updateEntryItem(entryid, userid, status);

    return res.status(200).json(entry).end();
  } catch (error) {
    console.error(error);
    return res.status(500).send({ message: "Database error" });
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

    // Check missing data
    if (!userid || !mediaid || !status || !mediaType || !title || !poster) {
      console.error({
        mediaid,
        userid,
        mediaType,
        status,
        title,
        poster,
      });
      return res.status(400).send({ message: "Missing Fields" });
    }

    // Check if this entry already exists
    const userEntries = await getEntriesByUserId(userid);
    const existingEntry = userEntries.find(
      (entry: ListEntry) => entry.mediaid == mediaid
    );
    if (existingEntry) {
      return res.status(400).send({ message: "Entry already exists" });
    }

    const user = await getUserById(userid);
    if (!user) {
      return res.status(400).send({ message: "User Not Found" });
    }

    // Media data to be used when everything goes correct
    const { data: mediaData } = await axios.get(
      `${TMDB_ENDPOINT}/${mediaType}/${mediaid}`,
      {
        params: {
          api_key: TMDB_API_KEY,
        },
      }
    );
    const { data: tagResult } = await axios.get(
      `${TMDB_ENDPOINT}/${mediaType}/${mediaid}/keywords`,
      {
        params: {
          api_key: TMDB_API_KEY,
        },
      }
    );
    const tagData =
      mediaType == "tv" ? tagResult?.results : tagResult?.keywords;
    mediaData.tags = tagData;

    let calculatedProgress = 0;
    if (status == MediaStatus.completed) {
      if (mediaType == MediaType.tv) {
        calculatedProgress = mediaData.number_of_episodes;
      } else {
        calculatedProgress = 1;
      }
    }

    let calculatedStartDate = startDate;
    if (
      !startDate &&
      (status == MediaStatus.completed || status == MediaStatus.watching)
    ) {
      calculatedStartDate = new Date().toISOString();
    }

    let calculatedEndDate = endDate;
    if (!startDate && status == MediaStatus.completed) {
      calculatedEndDate = new Date().toISOString();
    }

    const entry = await createNewEntry({
      mediaType,
      mediaid,
      userid,
      status,
      startDate: calculatedStartDate,
      endDate: calculatedEndDate,
      fav: fav ? fav : false,
      progress: calculatedProgress,
      rewatches: rewatches ? rewatches : 0,
      score,
      notes,
      title,
      poster,
      backdrop,
      data: mediaData,
    });

    // Add entry to the user
    user.entries.push({ id: entry._id.toString(), status, mediaType, mediaid });
    await user.save();

    // Create entry
    await createNewActivity({
      userid,
      status,
      title: entry.title,
      poster: entry.poster,
      mediaid: parseInt(entry.mediaid),
      mediaType: entry.mediaType,
      type: "media",
    });

    return res.status(200).json(entry).end();
  } catch (error) {
    console.error(error);
    return res.status(400).send({ message: "Some Error Occurred" });
  }
};

export const increaseProgress = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const { entryid } = req.params;

    const entry: EntryDocument = await getEntryById(entryid);
    if (!entry) {
      return res.status(400).send({ message: "Entry not found" });
    }

    let updateStatus = false;
    if (entry.mediaType == MediaType.movie) {
      entry.progress = 1;
      updateStatus = true;
    } else {
      if (entry.progress < entry.data.number_of_episodes) {
        entry.progress = entry.progress + 1;
        if (entry.progress == entry.data.number_of_episodes) {
          updateStatus = true;
        }
      }
    }

    if (updateStatus) {
      entry.status = MediaStatus.completed;
      const userid = lodash.get(req, "identity._id") as string;

      await updateEntryItem(entryid, userid, MediaStatus.completed);
    }

    if (!entry.startDate) {
      entry.startDate = new Date().toISOString();
    }
    if (!entry.endDate) {
      entry.endDate = new Date().toISOString();
    }

    const updatedEntry = await entry.save();

    // Create activity
    if (updateStatus) {
      await createNewActivity({
        userid: entry.userid,
        poster: entry.poster,
        status: "completed",
        mediaid: parseInt(entry.mediaid),
        mediaType: entry.mediaType,
        title: entry.title,
        type: "media",
      });
    } else {
      await createNewActivity({
        userid: entry.userid,
        poster: entry.poster,
        status: "completed",
        mediaid: parseInt(entry.mediaid),
        mediaType: entry.mediaType,
        title: entry.title,
        progress: updatedEntry.progress,
        type: "media",
      });
    }

    return res.status(200).json({
      ...updatedEntry,
      message: "Progress increased to" + updatedEntry.progress,
    });
  } catch (error) {
    console.error(error);
    return res.status(400).send({ message: "Database error" });
  }
};

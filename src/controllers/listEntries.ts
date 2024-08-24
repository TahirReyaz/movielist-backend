import { Request, Response } from "express";
import mongoose from "mongoose";
import axios from "axios";
import lodash from "lodash";

import {
  ListEntry,
  createNewEntry,
  deleteEntryById,
  getEntries,
  getEntry,
  getEntryById,
} from "../db/listEntries";
import {
  MediaStatus,
  MediaType,
  TMDB_API_KEY,
  TMDB_ENDPOINT,
} from "../constants/misc";
import { EntryDocument } from "../helpers/stats";
import { createNewActivity } from "../helpers/activity";
import { getUserByUsername } from "../db/users";

export const getAllListEntries = async (req: Request, res: Response) => {
  try {
    const entries = await getEntries();

    return res.status(200).json(entries);
  } catch (error) {
    console.error(error);
    return res.status(400).send({ message: "Database error" });
  }
};

export const getUserEntriesByMediaType = async (
  req: Request,
  res: Response
) => {
  try {
    const { username, mediaType } = req.params;
    const user = await getUserByUsername(username);

    const entries = await getEntries({ owner: user._id, mediaType });

    return res.status(200).json(entries);
  } catch (error) {
    console.error(error);
    return res.status(400).send({ message: "Database error" });
  }
};

export const getEntryController = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const entry = await getEntry({ _id: id });

    return res.status(200).json(entry);
  } catch (error) {
    console.error(error);
    return res.status(400).send({ message: "Databse error" });
  }
};

export const deleteEntry = async (req: Request, res: Response) => {
  try {
    const { entryid } = req.params;

    const entry = await getEntryById(entryid);
    if (!entry) {
      return res.status(400).send({ message: "Entry not found" });
    }

    const deletedEntry = await deleteEntryById(entryid);

    return res.json(deletedEntry);
  } catch (error) {
    console.error(error);
    return res.status(400).send({ message: "Database error" });
  }
};

export const updateListEntry = async (req: Request, res: Response) => {
  try {
    const userid = lodash.get(req, "identity._id") as mongoose.Types.ObjectId;
    const { status } = req.body;
    if (!status) {
      console.error({
        mediaid: req.body.mediaid,
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
      userid: userid.toString(),
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
    return res.status(500).send({ message: "Database error" });
  }
};

export const createListEntry = async (req: Request, res: Response) => {
  try {
    const userid = lodash.get(req, "identity._id") as mongoose.Types.ObjectId;
    const {
      mediaid,
      mediaType,
      status,
      startDate,
      endDate,
      progress,
      rewatches,
      score,
      notes,
      title,
      poster,
      backdrop,
    } = req.body;

    // Check missing data
    if (!mediaid || !status || !mediaType || !title || !poster) {
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
    const userEntries = await getEntries({ userid });
    const existingEntry = userEntries.find(
      (entry: ListEntry) => entry.mediaid == mediaid
    );
    if (existingEntry) {
      return res.status(400).send({ message: "Entry already exists" });
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
      progress: calculatedProgress,
      rewatches: rewatches ? rewatches : 0,
      score,
      notes,
      title,
      poster,
      backdrop,
      data: mediaData,
    });

    // Create entry
    await createNewActivity({
      userid: userid.toString(),
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

export const increaseProgress = async (req: Request, res: Response) => {
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
        userid: entry.owner.toString(),
        poster: entry.poster,
        status: "completed",
        mediaid: parseInt(entry.mediaid),
        mediaType: entry.mediaType,
        title: entry.title,
        type: "media",
      });
    } else {
      await createNewActivity({
        userid: entry.owner.toString(),
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

import { Request, Response } from "express";
import mongoose from "mongoose";
import lodash from "lodash";

import {
  ListEntry,
  ListEntryModel,
  createNewEntry,
  deleteEntryById,
  getEntries,
  getEntry,
  getEntryById,
} from "../db/listEntries";
import { MediaStatus, MediaType } from "../constants/misc";
import { EntryDocument } from "../helpers/stats";
import { createNewActivity } from "../helpers/activity";
import { fetchEntryMedia } from "../helpers/tmdb";
import { clampProgress, getTotalUnits } from "../helpers/entryData";
import { freshDataFields, needsRefresh } from "../helpers/entryRefresh";
import { markStatsDirty } from "../db/users";
import { isListStatus, isMediaType } from "../Interfaces/media";

/** Fields a user is allowed to change on their own entry. */
const EDITABLE_FIELDS = [
  "status",
  "startDate",
  "endDate",
  "progress",
  "rewatches",
  "score",
  "notes",
] as const;

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
    const { mediaType } = req.params;
    const userid = lodash.get(req, "identity._id") as mongoose.Types.ObjectId;

    const entries = await getEntries({ owner: userid, mediaType });

    return res.status(200).json(entries);
  } catch (error) {
    console.error(error);
    return res.status(400).send({ message: "Database error" });
  }
};

export const getUserEntriesByMediaId = async (req: Request, res: Response) => {
  try {
    const userid = lodash.get(req, "identity._id") as mongoose.Types.ObjectId;

    const { mediaid } = req.params;

    const entries = await getEntries({ owner: userid, mediaid });
    if (!entries || entries.length === 0) {
      return res.status(404).send({ message: "Media not found" });
    }

    return res.status(200).json(entries[0]);
  } catch (error) {
    console.error(error);
    return res.status(500).send({ message: "Database error" });
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
    await markStatsDirty([entry.owner]);

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
    if (!isListStatus(status)) {
      return res.status(400).send({ message: "Missing or invalid status" });
    }

    const { entryid } = req.params;

    const entry: EntryDocument = await getEntryById(entryid);
    if (!entry) {
      return res.status(404).send({ message: "Entry not found" });
    }

    // Only copy whitelisted fields. `!== undefined` so 0 / "" can be saved too.
    for (const key of EDITABLE_FIELDS) {
      if (req.body[key] !== undefined) {
        entry.set(key, req.body[key]);
      }
    }

    // Only hit TMDB if the stored snapshot is outdated; keep the old one if TMDB fails.
    if (isMediaType(entry.mediaType) && needsRefresh(entry)) {
      const fetched = await fetchEntryMedia(entry.mediaType, entry.mediaid);
      if (fetched) {
        entry.set(freshDataFields(entry.mediaType, fetched));
      }
    }

    const totalUnits = getTotalUnits(entry.mediaType, entry.data);
    const now = new Date().toISOString();

    if (status === MediaStatus.completed) {
      if (!entry.startDate) entry.startDate = now;
      if (!entry.endDate) entry.endDate = now;
      if (totalUnits !== null) entry.progress = totalUnits;
    } else {
      if (
        (status === MediaStatus.watching || status === MediaStatus.rewatching) &&
        !entry.startDate
      ) {
        entry.startDate = now;
      }
      entry.progress = clampProgress(entry.progress, totalUnits);
    }

    await entry.save();
    await markStatsDirty([entry.owner]);

    // Create activity
    await createNewActivity({
      userid: userid.toString(),
      status,
      title: entry.title,
      poster: entry.poster,
      mediaid: entry.mediaid,
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
    if (!mediaid || !isListStatus(status) || !isMediaType(mediaType)) {
      return res.status(400).send({ message: "Missing Fields" });
    }

    // Check if this entry already exists
    const existingEntry = await getEntries({ owner: userid, mediaid });
    if (existingEntry.length > 0) {
      return res.status(400).send({ message: "Entry already exists" });
    }

    // Also rejects whole shows: only movies and seasons can be listed.
    const fetched = await fetchEntryMedia(mediaType, mediaid);
    if (!fetched) {
      return res.status(400).send({
        message:
          mediaType === MediaType.tv
            ? "Only a season (showId-seasonNumber) can be added to a list"
            : "Could not fetch media details",
      });
    }

    const { data } = fetched;
    const totalUnits = getTotalUnits(mediaType, data);
    const now = new Date().toISOString();

    const calculatedProgress =
      status === MediaStatus.completed && totalUnits !== null
        ? totalUnits
        : clampProgress(progress ?? 0, totalUnits);

    let calculatedStartDate = startDate;
    if (
      !startDate &&
      (status === MediaStatus.completed ||
        status === MediaStatus.watching ||
        status === MediaStatus.rewatching)
    ) {
      calculatedStartDate = now;
    }

    let calculatedEndDate = endDate;
    if (!endDate && status === MediaStatus.completed) {
      calculatedEndDate = now;
    }

    const entry = await createNewEntry({
      mediaType,
      mediaid,
      owner: userid,
      status,
      startDate: calculatedStartDate,
      endDate: calculatedEndDate,
      progress: calculatedProgress,
      rewatches: rewatches ?? 0,
      score,
      notes,
      poster: fetched.poster ?? poster,
      backdrop: backdrop ?? fetched.backdrop ?? undefined,
      // data, dataVersion, dataUpdatedAt (+ "Show - Season N" title for seasons)
      ...freshDataFields(mediaType, fetched),
      title: fetched.title || title,
    });
    await markStatsDirty([userid]);

    // Create entry
    await createNewActivity({
      userid: userid.toString(),
      status,
      title: entry.title,
      poster: entry.poster,
      mediaid: entry.mediaid,
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

    // An airing season may have new episodes: refresh (max once a day) when at the end.
    const atEnd = (entry.progress ?? 0) >= (getTotalUnits(entry.mediaType, entry.data) ?? 0);
    if (atEnd && isMediaType(entry.mediaType) && needsRefresh(entry, 24 * 60 * 60 * 1000)) {
      const fetched = await fetchEntryMedia(entry.mediaType, entry.mediaid);
      if (fetched) entry.set(freshDataFields(entry.mediaType, fetched));
    }

    const totalUnits = getTotalUnits(entry.mediaType, entry.data);
    const current = entry.progress ?? 0;

    if (totalUnits !== null && current >= totalUnits) {
      return res.status(400).send({ message: "Already at the last episode" });
    }

    entry.progress = current + 1;
    const isFinished = totalUnits !== null && entry.progress >= totalUnits;
    const now = new Date().toISOString();

    if (!entry.startDate) entry.startDate = now;
    if (isFinished) {
      entry.status = MediaStatus.completed;
      if (!entry.endDate) entry.endDate = now;
    } else if (entry.status === MediaStatus.planning) {
      entry.status = MediaStatus.watching;
    }

    const updatedEntry = await entry.save();
    await markStatsDirty([entry.owner]);

    await createNewActivity({
      userid: entry.owner.toString(),
      poster: entry.poster,
      status: isFinished ? MediaStatus.completed : MediaStatus.watching,
      mediaid: entry.mediaid,
      mediaType: entry.mediaType,
      title: entry.title,
      // Only include progress while still watching ("Watched ep 3 of ...")
      ...(isFinished ? {} : { progress: updatedEntry.progress }),
      type: "media",
    });

    return res.status(200).json({
      ...updatedEntry.toObject(),
      message: "Progress increased to " + updatedEntry.progress,
    });
  } catch (error) {
    console.error(error);
    return res.status(400).send({ message: "Database error" });
  }
};

export const delAllUserEntries = async (req: Request, res: Response) => {
  try {
    const { mediaType } = req.params;
    const userid = lodash.get(req, "identity._id") as mongoose.Types.ObjectId;

    if (!mediaType || (mediaType !== "movie" && mediaType !== "tv")) {
      return res.status(400).send({ message: "Wrong media type" });
    }

    await ListEntryModel.deleteMany({ owner: userid, mediaType });
    await markStatsDirty([userid]);

    return res.status(200).send({ message: "Deleted all user entries" });
  } catch (error) {
    console.error(error);
    return res.sendStatus(500);
  }
};

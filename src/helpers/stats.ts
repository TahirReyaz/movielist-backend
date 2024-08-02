import axios from "axios";
import express from "express";
import { Document } from "mongoose";

import { TMDB_API_KEY, TMDB_ENDPOINT } from "../constants/misc";
import {
  ListEntry,
  ListEntryModel,
  getEntriesByUserId,
} from "../db/listEntries";

interface EntryDocument extends ListEntry, Document {}

export const transformEntries = async (
  req: express.Request,
  res: express.Response
) => {
  const { id } = req.params;
  try {
    const entries: EntryDocument[] = await getEntriesByUserId(id);
    if (!entries) {
      res.status(404).send({ message: "User with this id not found" });
    }
    if (entries.length == 0) {
      res.status(400).send({ message: "No entries on this user" });
    }

    await Promise.all(
      entries.map(async (entry) => {
        try {
          // Get the media data
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
            entry.mediaType === "tv" ? tagResult?.results : tagResult?.keywords;
          mediaData.tags = tagData;

          entry.data = mediaData;

          // Save the updated entry to MongoDB
          await ListEntryModel.updateOne(
            { _id: entry._id },
            { $set: { data: entry.data } }
          );
        } catch (error) {
          console.error(
            `Failed to fetch data for entry ${entry.mediaid}:`,
            error
          );
          entry.data = null; // Handle error as needed
        }

        return entry;
      })
    );
    res.status(200).send({ message: "Transformed" });
  } catch (error) {
    console.error("Failed to transform entries:", error);
    throw error;
  }
};

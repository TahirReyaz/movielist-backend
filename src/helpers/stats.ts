import express from "express";
import { Document } from "mongoose";

import { MediaStatus, MediaType } from "../constants/misc";
import { ListEntry, ListEntryModel, getEntries } from "../db/listEntries";

export interface EntryDocument extends ListEntry, Document {}

export const calculateWeightedScore = (
  voteAverage: number,
  voteCount: number,
  globalAverage = 7,
  m = 500
): number => {
  const weightedScore =
    (voteAverage * voteCount + globalAverage * m) / (voteCount + m);
  return parseFloat(weightedScore.toFixed(2)); // Rounding to 2 decimal places for better readability
};

export const transformEntries = async (
  req: express.Request,
  res: express.Response
) => {
  const { id } = req.params;
  try {
    const entries: EntryDocument[] = await getEntries({ owner: id });
    if (!entries) {
      res.status(404).send({ message: "User with this id not found" });
    }
    if (entries.length == 0) {
      res.status(400).send({ message: "No entries on this user" });
    }

    await Promise.all(
      entries.map(async (entry) => {
        try {
          // Update the progress
          if (entry.status === MediaStatus.completed) {
            if (entry.mediaType === MediaType.movie) {
              entry.progress = 1;
            } else {
              entry.progress = entry.data.number_of_episodes;
            }
          }

          // Save the updated entry to MongoDB
          await ListEntryModel.updateOne(
            { _id: entry._id },
            { $set: { data: entry.data, progress: entry.progress } }
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

import express from "express";
import { Document } from "mongoose";

import { MediaStatus, MediaType } from "../constants/misc";
import { ListEntry, ListEntryModel, getEntries } from "../db/listEntries";
import { Distribution } from "../db/users";
import { fetchMediaData } from "./tmdb";

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

export const calculateMeanScore = (scores: number[]): number => {
  if (scores.length === 0) return 0;
  const sum = scores.reduce((acc, score) => acc + score, 0);
  if (isNaN(sum)) {
    return 0;
  }
  return sum / scores.length;
};

export const calculateStatusDist = ({
  statusDist,
  status,
  hoursWatched,
  hoursPlanned,
}: {
  statusDist: Distribution[];
  hoursWatched: number;
  hoursPlanned: number;
  status: string;
}) => {
  let foundStatusIndex = statusDist.findIndex(
    (item: Distribution) => item.format === status
  );
  if (foundStatusIndex > -1) {
    statusDist.push({
      count: 0,
      hoursWatched: 0,
      format: status,
      meanScore: 0,
    });
    foundStatusIndex = 0;
  }
  statusDist[foundStatusIndex].count += 1;
  statusDist[foundStatusIndex].hoursWatched += hoursWatched;

  if (status === MediaStatus.planning) {
    statusDist[foundStatusIndex].hoursWatched += hoursPlanned;
  }

  return statusDist;
};

export const calculateGenreStats = ({
  genres,
  genreStats,
  hoursWatched,
  title,
  poster,
  mediaid,
  mediaType,
}: {
  genres: { id: number; name: string }[];
  genreStats: Record<string, any>;
  hoursWatched: number;
  title: string;
  poster: string;
  mediaid: number;
  mediaType: string;
}) => {
  genres.forEach((genre: { id: number; name: string }) => {
    if (!genreStats[genre.id]) {
      genreStats[genre.id] = {
        title: genre.name,
        statTypeId: genre.id,
        count: 0,
        meanScore: 0,
        timeWatched: 0,
        list: [],
      };
    }
    genreStats[genre.id].count += 1;
    genreStats[genre.id].timeWatched += hoursWatched;
    genreStats[genre.id].meanScore = 0;
    genreStats[genre.id].list.push({
      title: title,
      posterPath: poster,
      id: mediaid,
      mediaType,
    });
  });

  return genreStats;
};

export const generateTagsStats = ({
  tags,
  tagStats,
  hoursWatched,
  title,
  poster,
  mediaid,
  mediaType,
}: {
  tags: { id: number; name: string }[];
  tagStats: Record<string, any>;
  hoursWatched: number;
  title: string;
  poster: string;
  mediaid: number;
  mediaType: string;
}) => {
  tags.forEach((tag: { id: number; name: string }) => {
    if (!tagStats[tag.id]) {
      tagStats[tag.id] = {
        title: tag.name,
        statTypeId: tag.id,
        count: 0,
        meanScore: 0,
        timeWatched: 0,
        list: [],
      };
    }
    tagStats[tag.id].count += 1;
    tagStats[tag.id].timeWatched += hoursWatched;
    tagStats[tag.id].meanScore = 0;
    tagStats[tag.id].list.push({
      title: title,
      posterPath: poster,
      id: mediaid,
      mediaType,
    });
  });

  return tagStats;
};

export const calculateCountryDist = ({
  countryDist,
  countries,
  hoursWatched,
}: {
  countryDist: Distribution[];
  countries: any[];
  hoursWatched: number;
}) => {
  countries.forEach((country) => {
    let foundStatusIndex = countryDist.findIndex(
      (item: Distribution) => item.format === country.iso_3166_1
    );
    if (foundStatusIndex > -1) {
      countryDist.push({
        count: 0,
        hoursWatched: 0,
        format: country.iso_3166_1,
        meanScore: 0,
      });
      foundStatusIndex = 0;
    }
    countryDist[foundStatusIndex].count += 1;
    countryDist[foundStatusIndex].hoursWatched += hoursWatched;
  });

  return countryDist;
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
      res.status(404).send({ message: "No entries on this user" });
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

          const mediaData = await fetchMediaData(
            entry.mediaType,
            Number(entry.mediaid)
          );

          // Save the updated entry to MongoDB
          await ListEntryModel.updateOne(
            { _id: entry._id },
            { $set: { data: mediaData, progress: entry.progress } }
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

    const updatedEntries: EntryDocument[] = await getEntries({ owner: id });
    res.status(200).send({ message: "Transformed", data: updatedEntries });
  } catch (error) {
    console.error("Failed to transform entries:", error);
    throw error;
  }
};

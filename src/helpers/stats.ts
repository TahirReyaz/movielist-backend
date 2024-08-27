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

export const calculateMeanScore = (
  currentMean: number,
  currentScore: number,
  count: number
): number => {
  const ans = (currentMean + currentScore) / count;
  if (Number.isNaN(ans)) {
    return 0;
  }
  return ans;
};

export const calculateStatusDist = ({
  statusDist,
  status,
  hoursWatched,
  hoursPlanned,
  score,
}: {
  statusDist: Distribution[];
  hoursWatched: number;
  hoursPlanned: number;
  status: string;
  score: number;
}) => {
  let foundStatusIndex = statusDist.findIndex(
    (item: Distribution) => item.format === status
  );
  if (foundStatusIndex === -1) {
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

  const meanScore = calculateMeanScore(
    statusDist[foundStatusIndex].meanScore,
    score,
    statusDist[foundStatusIndex].count
  );
  statusDist[foundStatusIndex].meanScore = meanScore;

  if (status === MediaStatus.planning) {
    statusDist[foundStatusIndex].hoursWatched += hoursPlanned;
  }

  return statusDist;
};

export const generateReleaseYearStats = ({
  stats,
  releaseDate,
  hoursWatched,
}: {
  stats: Distribution[];
  releaseDate: string;
  hoursWatched: number;
}) => {
  const releaseYear = new Date(releaseDate).getFullYear();
  let foundStatusIndex = stats.findIndex(
    (item: Distribution) => item.format === releaseYear.toString()
  );
  if (foundStatusIndex === -1) {
    stats.push({
      count: 0,
      hoursWatched: 0,
      format: releaseYear.toString(),
      meanScore: 0,
    });
    foundStatusIndex = 0;
  }
  stats[foundStatusIndex].count += 1;
  stats[foundStatusIndex].hoursWatched += hoursWatched;

  return stats;
};

export const generateWatchYearStats = ({
  stats,
  watchDate,
  hoursWatched,
}: {
  stats: Distribution[];
  watchDate: string;
  hoursWatched: number;
}) => {
  const watchYear = new Date(watchDate).getFullYear();
  let foundStatusIndex = stats.findIndex(
    (item: Distribution) => item.format === watchYear.toString()
  );
  if (foundStatusIndex === -1) {
    stats.push({
      count: 0,
      hoursWatched: 0,
      format: watchYear.toString(),
      meanScore: 0,
    });
    foundStatusIndex = 0;
  }
  stats[foundStatusIndex].count += 1;
  stats[foundStatusIndex].hoursWatched += hoursWatched;

  return stats;
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
    try {
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
    } catch (error) {
      console.error(error);
      console.log({ mediaType, mediaid, name, title });
    }
  });

  return tagStats;
};

export const generateActorStats = ({
  casts,
  castStats,
  hoursWatched,
  title,
  poster,
  mediaid,
  mediaType,
  score,
}: {
  casts: { id: number; name: string }[];
  castStats: Record<string, any>;
  hoursWatched: number;
  title: string;
  poster: string;
  mediaid: number;
  mediaType: string;
  score: number;
}) => {
  casts.forEach((cast: { id: number; name: string }) => {
    try {
      if (!castStats[cast.id]) {
        castStats[cast.id] = {
          title: cast.name,
          statTypeId: cast.id,
          count: 0,
          meanScore: 0,
          timeWatched: 0,
          list: [],
        };
      }
      castStats[cast.id].count += 1;
      castStats[cast.id].timeWatched += hoursWatched;
      const meanScore = calculateMeanScore(
        castStats[cast.id].meanScore,
        score,
        castStats[cast.id].count
      );
      castStats[cast.id].meanScore = meanScore;
      castStats[cast.id].list.push({
        title: title,
        posterPath: poster,
        id: mediaid,
        mediaType,
      });
    } catch (error) {
      console.error(error);
      console.log({ mediaType, mediaid, name, title });
    }
  });

  return castStats;
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
    if (foundStatusIndex === -1) {
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
      return res.status(404).send({ message: "User with this id not found" });
    }
    if (entries.length == 0) {
      return res.status(404).send({ message: "No entries on this user" });
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

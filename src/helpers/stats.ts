import express from "express";
import { Document } from "mongoose";

import { MediaStatus, MediaType } from "../constants/misc";
import { ListEntry, ListEntryModel, getEntries } from "../db/listEntries";
import { Distribution } from "../db/overviewStats";
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
    foundStatusIndex = statusDist.length - 1;
  }
  statusDist[foundStatusIndex].count += 1;

  statusDist[foundStatusIndex].meanScore = calculateMeanScore(
    statusDist[foundStatusIndex].meanScore,
    score,
    statusDist[foundStatusIndex].count
  );

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
  score,
  stats,
  releaseDate,
  hoursWatched,
}: {
  score: number;
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
    foundStatusIndex = stats.length - 1;
  }

  stats[foundStatusIndex].count += 1;

  const meanScore = calculateMeanScore(
    stats[foundStatusIndex].meanScore,
    score,
    stats[foundStatusIndex].count
  );

  stats[foundStatusIndex].meanScore = meanScore;
  stats[foundStatusIndex].hoursWatched += hoursWatched;

  return stats;
};

export const generateWatchYearStats = ({
  stats,
  watchDate,
  hoursWatched,
  score,
}: {
  stats: Distribution[];
  watchDate: string;
  hoursWatched: number;
  score: number;
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
    foundStatusIndex = stats.length - 1;
  }
  stats[foundStatusIndex].count += 1;

  stats[foundStatusIndex].meanScore = calculateMeanScore(
    stats[foundStatusIndex].meanScore,
    score,
    stats[foundStatusIndex].count
  );

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
  score,
}: {
  genres: { id?: number; name?: string }[];
  genreStats: Record<string, any>;
  hoursWatched: number;
  title: string;
  poster: string;
  mediaid: number;
  mediaType: string;
  score: number;
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

    genreStats[genre.id].meanScore = calculateMeanScore(
      genreStats[genre.id].meanScore,
      score,
      genreStats[genre.id].count
    );

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
  score,
}: {
  tags: { id?: number; name?: string }[];
  tagStats: Record<string, any>;
  hoursWatched: number;
  title: string;
  poster: string;
  mediaid: number;
  mediaType: string;
  score: number;
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

      tagStats[tag.id].meanScore = calculateMeanScore(
        tagStats[tag.id].meanScore,
        score,
        tagStats[tag.id].count
      );

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

export const generateStaffStats = ({
  staff,
  stats,
  hoursWatched,
  title,
  poster,
  mediaid,
  mediaType,
  score,
}: {
  staff: { id?: number; name?: string }[];
  stats: Record<string, any>;
  hoursWatched: number;
  title: string;
  poster: string;
  mediaid: number;
  mediaType: string;
  score: number;
}) => {
  staff.forEach(
    (person: { id: number; name: string; profile_path: string }) => {
      try {
        if (!stats[person.id]) {
          stats[person.id] = {
            title: person.name,
            staffId: person.id,
            count: 0,
            meanScore: 0,
            timeWatched: 0,
            profilePath: person.profile_path,
            list: [],
          };
        }
        stats[person.id].count += 1;
        stats[person.id].timeWatched += hoursWatched;
        const meanScore = calculateMeanScore(
          stats[person.id].meanScore,
          score,
          stats[person.id].count
        );
        stats[person.id].meanScore = meanScore;
        stats[person.id].list.push({
          title: title,
          posterPath: poster,
          id: mediaid,
          mediaType,
        });
      } catch (error) {
        console.error(error);
        console.log({ mediaType, mediaid, name, title });
      }
    }
  );

  return stats;
};

export const calculateCountryDist = ({
  countryDist,
  countries,
  hoursWatched,
  score,
}: {
  countryDist: Distribution[];
  countries: any[];
  hoursWatched: number;
  score: number;
}) => {
  countries.forEach((country) => {
    let foundStatusIndex = countryDist.findIndex(
      (item: Distribution) => item.format === country
    );
    if (foundStatusIndex === -1) {
      countryDist.push({
        count: 0,
        hoursWatched: 0,
        format: country,
        meanScore: 0,
      });
      foundStatusIndex = countryDist.length - 1;
    }
    countryDist[foundStatusIndex].count += 1;

    countryDist[foundStatusIndex].meanScore = calculateMeanScore(
      countryDist[foundStatusIndex].meanScore,
      score,
      countryDist[foundStatusIndex].count
    );

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
            entry.mediaid
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

// DATA: adult, vote avg, runtime: single for movies avg for tv, production_companies, status, number of episodes: default 1 for movies, origin country: array, original_language, (release date, first air date), genres [id, name], tags [id, name], cast [id, name, profile_path], crew [id, name, profile_path]
// GENRES STATS: id, count, time watched, meanScore, list [title, posterPath, id]
// TAG STATS: same as GENRE STATS
// CAST STATS:  same as GENRE STATS, profilePath
// CREW STATS:  same as GENRE STATS, profilePath
// DIST: format, count, hoursWatched, meanScore
// OVERVIEW STATS: count, daysWatched, daysPlanned, meanScore, score [], epsCount [], formatDist [], statusDist [DIST],  countryDist [DIST], releaseYear [DIST], watchYear: [DIST]

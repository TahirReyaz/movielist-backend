import mongoose from "mongoose";
import express from "express";

import { Distribution, UserModel, getUserById } from "../db/users";
import { getEntries } from "../db/listEntries";
import { MediaStatus, MediaType } from "../constants/misc";
import {
  calculateGenreStats,
  calculateStatusDist,
  calculateWeightedScore,
} from "../helpers/stats";

// Helper function to calculate mean score
const calculateMeanScore = (scores: number[]): number => {
  if (scores.length === 0) return 0;
  const sum = scores.reduce((acc, score) => acc + score, 0);
  if (isNaN(sum)) {
    return 0;
  }
  return sum / scores.length;
};

export const generateUserStats = async (userId: string) => {
  try {
    const user = await getUserById(userId);
    if (!user) throw new Error("User not found");

    const entries = await getEntries({ owner: userId });

    // Initialize stats
    let overviewStatsMovie: any = {
      count: 0,
      episodesWatched: 0,
      daysWatched: 0,
      daysPlanned: 0,
      meanScore: 0,
      score: Array(10).fill({ count: 0, hoursWatched: 0, meanScore: 0 }),
      epsCount: [],
      formatDist: {},
      statusDist: [],
      countryDist: {},
      releaseYear: {},
      watchYear: {},
    };
    let overviewStatsTv: any = {
      count: 0,
      episodesWatched: 0,
      daysWatched: 0,
      daysPlanned: 0,
      meanScore: 0,
      score: Array(10).fill({ count: 0, hoursWatched: 0, meanScore: 0 }),
      epsCount: [],
      formatDist: {},
      statusDist: {},
      countryDist: {},
      releaseYear: {},
      watchYear: {},
    };

    let statusDistMovie: Distribution[] = [],
      statusDistTv: Distribution[] = [],
      genreStatsMovie: Record<string, any> = {},
      genreStatsTv: Record<string, any> = {};

    let totalHoursWatched = 0;

    // Go over each entry and generate stats
    entries.forEach((entry) => {
      try {
        const { mediaType, status, progress, data, title, poster, mediaid } =
          entry;

        // Pick the stats to update
        let overviewStats = overviewStatsMovie,
          statusDist: Distribution[] = statusDistMovie,
          genreStats: Record<string, any> = genreStatsMovie;
        if (mediaType == MediaType.tv) {
          overviewStats = overviewStatsTv;
          statusDist = statusDistTv;
          genreStats = genreStatsTv;
        }

        let entryScore = 0;
        if (data?.vote_average && data?.vote_count) {
          entryScore = calculateWeightedScore(
            parseInt(data.vote_average),
            parseInt(data.vote_count)
          );
        }

        if (status === "completed") overviewStats.count += 1;
        if (mediaType === MediaType.tv) {
          overviewStats.episodesWatched += progress;
        }

        // Set episode duration
        let episodeDuration = 60;
        if (mediaType === MediaType.movie) {
          episodeDuration = data?.runtime ? data.runtime : 60;
        } else {
          episodeDuration =
            data?.episode_run_time && data?.episode_run_time[0]
              ? data.episode_run_time[0]
              : 40;
        }
        episodeDuration /= 60;

        // Calculate days watched and planned
        const hoursWatched = progress * episodeDuration;

        let epsPlanned = 1;
        if (mediaType == MediaType.tv && data.number_of_episodes) {
          epsPlanned = data.number_of_episodes;
        }
        const hoursPlanned = epsPlanned * episodeDuration;

        if (
          status === MediaStatus.watching ||
          status === MediaStatus.completed
        ) {
          totalHoursWatched += hoursWatched;
          overviewStats.daysWatched += hoursWatched / 24;
        } else if (status === MediaStatus.planning) {
          overviewStats.daysPlanned += hoursPlanned / 24;
        }

        // Status Distribution
        statusDist = calculateStatusDist({
          statusDist,
          hoursWatched,
          hoursPlanned,
          status,
        });

        // Genre stats
        if (status === MediaStatus.completed && data && data.genres) {
          genreStats = calculateGenreStats({
            genreStats,
            mediaType,
            mediaid: Number(mediaid),
            title,
            poster,
            genres: data.genres,
            hoursWatched,
          });
        }

        // Assign the calculated stats accoding to the media type
        if (mediaType == MediaType.movie) {
          statusDistMovie = statusDist;
          overviewStatsMovie = overviewStats;
          genreStatsMovie = genreStats;
        } else {
          statusDistTv = statusDist;
          overviewStatsTv = overviewStats;
          genreStatsTv = genreStats;
        }
      } catch (error) {
        throw new Error(error);
      }
    });

    // Save stats
    const genreArrayMovie = Object.values(genreStatsMovie);
    const genreArrayTv = Object.values(genreStatsTv);

    await UserModel.updateOne(
      { _id: userId },
      {
        $set: {
          // Reset the genres arrays to empty
          "stats.movie.genres": [],
          "stats.tv.genres": [],

          // Set the overview statistics
          "stats.movie.overview": {
            ...overviewStatsMovie,
            statusDist: statusDistMovie,
          },
          "stats.tv.overview": { ...overviewStatsTv, statusDist: statusDistTv },
        },
      }
    );

    // Push the new genre data into the arrays
    await UserModel.updateOne(
      { _id: userId }, // Replace with the actual user ID or query
      {
        $push: {
          "stats.movie.genres": { $each: genreArrayMovie },
          "stats.tv.genres": { $each: genreArrayTv },
        },
      }
    );
  } catch (error) {
    console.error("Error generating user stats:", error);
  }
};

export const generateAllUserStats = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const users = await UserModel.find({}).exec();
    const statsPromises = users.map((user) =>
      generateUserStats(user._id.toString())
    );
    await Promise.all(statsPromises);
    console.log("Stats generation completed for all users.");
    return res.status(200).send({ message: "Generated" });
  } catch (error) {
    console.error("Error generating stats for all users:", error);
    return res.status(500).send({ message: "Error occurred. Check console" });
  }
};

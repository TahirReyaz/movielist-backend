import mongoose from "mongoose";
import express from "express";

import { Distribution, UserModel, getUserById } from "../db/users";
import { getEntries } from "../db/listEntries";
import { MediaStatus, MediaType } from "../constants/misc";
import { calculateWeightedScore } from "../helpers/stats";

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
    const overviewStatsMovie: any = {
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
    const overviewStatsTv: any = {
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
      statusDistTv: Distribution[] = [];

    const genreStatsMovie: Record<string, any> = {};
    const genreStatsTv: Record<string, any> = {};

    let totalHoursWatched = 0;

    // Go over each entry and generate stats
    entries.forEach((entry) => {
      try {
        const { mediaType, status, progress, data } = entry;
        let score = 0;
        if (data?.vote_average && data?.vote_count) {
          score = calculateWeightedScore(
            parseInt(data.vote_average),
            parseInt(data.vote_count)
          );
        }

        if (mediaType === MediaType.movie && status === "completed")
          overviewStatsMovie.count += 1;
        if (mediaType === MediaType.tv && status === "completed") {
          overviewStatsTv.count += 1;
          overviewStatsTv.episodesWatched += progress;
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

        // Calculate days watched
        const hoursWatched = progress * episodeDuration;
        if (
          status === MediaStatus.watching ||
          status === MediaStatus.completed
        ) {
          totalHoursWatched += hoursWatched;
          if (mediaType === MediaType.movie) {
            overviewStatsMovie.daysWatched += hoursWatched / 24;
          } else {
            overviewStatsTv.daysWatched += hoursWatched / 24;
          }
        } else if (status === MediaStatus.planning) {
          let epsPlanned = 1;
          if (mediaType == MediaType.tv && data?.number_of_episodes) {
            epsPlanned = data.number_of_episodes;
          }
          const hoursPlanned = epsPlanned * episodeDuration;
          if (mediaType === MediaType.movie) {
            overviewStatsMovie.daysPlanned += hoursPlanned / 24;
          } else {
            overviewStatsTv.daysPlanned += hoursPlanned / 24;
          }
        }

        // Status Distribution
        let statusDist: Distribution[] = [];
        if (mediaType == MediaType.movie) {
          statusDist = statusDistMovie;
        } else {
          statusDist = statusDistTv;
        }

        const foundStatusIndex = statusDist.findIndex(
          (item: Distribution) => item.format === status
        );
        if (foundStatusIndex > -1) {
          statusDist[foundStatusIndex].count += 1;
          statusDist[foundStatusIndex].hoursWatched += hoursWatched;
          statusDist[foundStatusIndex].meanScore = 0;

          if (status === MediaStatus.planning) {
            let epsPlanned = 1;
            if (mediaType == MediaType.tv && data?.number_of_episodes) {
              epsPlanned = data.number_of_episodes;
            }
            const hoursPlanned = epsPlanned * episodeDuration;
            statusDist[foundStatusIndex].hoursWatched += hoursPlanned;
          }
        } else {
          statusDist.push({
            count: 1,
            hoursWatched,
            format: status,
            meanScore: 0,
          });

          if (status === MediaStatus.planning) {
            let epsPlanned = 1;
            if (mediaType == MediaType.tv && data?.number_of_episodes) {
              epsPlanned = data.number_of_episodes;
            }
            const hoursPlanned = epsPlanned * episodeDuration;
            statusDist[0].hoursWatched = hoursPlanned;
          }
        }

        if (mediaType == MediaType.movie) {
          statusDistMovie = statusDist;
        } else {
          statusDistTv = statusDist;
        }

        // Genre stats
        if (status === MediaStatus.completed && data && data.genres) {
          const hoursWatched = progress * episodeDuration;
          if (mediaType == MediaType.movie) {
            data.genres.forEach((genre: { id: number; name: string }) => {
              if (!genreStatsMovie[genre.id]) {
                genreStatsMovie[genre.id] = {
                  title: genre.name,
                  statTypeId: genre.id,
                  count: 0,
                  meanScore: 0,
                  timeWatched: 0,
                  list: [],
                };
              }
              genreStatsMovie[genre.id].count += 1;
              genreStatsMovie[genre.id].timeWatched += hoursWatched;
              genreStatsMovie[genre.id].list.push({
                title: entry.title,
                posterPath: entry.poster,
                id: Number(entry.mediaid),
                mediaType,
              });
              if (score) {
                const genreScores: any = genreStatsMovie[genre.id].list.map(
                  (item: any) => item.meanScore
                );
                genreScores.push(score);
                genreStatsMovie[genre.id].meanScore =
                  calculateMeanScore(genreScores);
              }
            });
          } else if (mediaType == MediaType.tv) {
            data.genres.forEach((genre: { id: number; name: string }) => {
              if (!genreStatsTv[genre.id]) {
                genreStatsTv[genre.id] = {
                  title: genre.name,
                  statTypeId: genre.id,
                  count: 0,
                  meanScore: 0,
                  timeWatched: 0,
                  list: [],
                };
              }
              genreStatsTv[genre.id].count += 1;
              genreStatsTv[genre.id].timeWatched += hoursWatched;
              genreStatsTv[genre.id].list.push({
                title: entry.title,
                posterPath: entry.poster,
                id: Number(entry.mediaid),
                mediaType,
              });
              if (score) {
                const genreScores: any = genreStatsTv[genre.id].list.map(
                  (item: any) => item.meanScore
                );
                genreScores.push(score);
                genreStatsTv[genre.id].meanScore =
                  calculateMeanScore(genreScores);
              }
            });
          }
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

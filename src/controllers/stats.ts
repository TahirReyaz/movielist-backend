import mongoose from "mongoose";
import express from "express";

import { UserSchema } from "../db/users";
import { ListEntrySchema } from "../db/listEntries";
import { MediaStatus, MediaType } from "../constants/misc";

const User = mongoose.model("User", UserSchema);
const ListEntry = mongoose.model("ListEntry", ListEntrySchema);

interface Stat {
  count: number;
  hoursWatched: number;
  meanScore: number;
}

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
    const user = await User.findById(userId).exec();
    if (!user) throw new Error("User not found");

    const entries = await ListEntry.find({ userid: userId }).exec();

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
      statusDist: {},
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

    const genreStatsMovie: Record<string, any> = {};
    const genreStatsTv: Record<string, any> = {};

    const scores: number[] = [];
    let totalHoursWatched = 0;

    entries.forEach((entry) => {
      const { mediaType, status, score, progress, data } = entry;

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
      if (status === MediaStatus.watching || status === MediaStatus.completed) {
        const hoursWatched = progress * episodeDuration;
        totalHoursWatched += hoursWatched;
        if (mediaType === MediaType.movie) {
          overviewStatsMovie.daysWatched += hoursWatched / 24;
        } else {
          overviewStatsTv.daysWatched += hoursWatched / 24;
        }
        if (score) {
          if (mediaType == MediaType.movie) {
            overviewStatsMovie.score[score - 1].count += 1;
            overviewStatsMovie.score[score - 1].hoursWatched += hoursWatched;
          } else {
            overviewStatsTv.score[score - 1].count += 1;
            overviewStatsTv.score[score - 1].hoursWatched += hoursWatched;
          }
          scores.push(score);
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

      // Update distributions (formatDist, statusDist, etc.)
      if (!overviewStatsMovie.formatDist[mediaType]) {
        overviewStatsMovie.formatDist[mediaType] = {
          count: 0,
          hoursWatched: 0,
          meanScore: 0,
        };
      }
      overviewStatsMovie.formatDist[mediaType].count += 1;
      overviewStatsMovie.formatDist[mediaType].hoursWatched +=
        totalHoursWatched;
      overviewStatsMovie.formatDist[mediaType].meanScore =
        calculateMeanScore(scores);

      if (!overviewStatsMovie.statusDist[status]) {
        overviewStatsMovie.statusDist[status] = {
          count: 0,
          hoursWatched: 0,
          meanScore: 0,
        };
      }
      if (!overviewStatsTv.statusDist[status]) {
        overviewStatsTv.statusDist[status] = {
          count: 0,
          hoursWatched: 0,
          meanScore: 0,
        };
      }
      overviewStatsMovie.statusDist[status].count += 1;
      overviewStatsMovie.statusDist[status].hoursWatched += totalHoursWatched;
      overviewStatsMovie.statusDist[status].meanScore =
        calculateMeanScore(scores);

      overviewStatsTv.statusDist[status].count += 1;
      overviewStatsTv.statusDist[status].hoursWatched += totalHoursWatched;
      overviewStatsTv.statusDist[status].meanScore = calculateMeanScore(scores);

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
    });
    // overviewStats.meanScore = calculateMeanScore(scores);

    // Save stats

    user.stats.movie.genres.splice(0, user.stats.movie.genres.length);
    user.stats.tv.genres.splice(0, user.stats.tv.genres.length);

    const genreArrayMovie = Object.values(genreStatsMovie);
    const genreArrayTv = Object.values(genreStatsTv);
    genreArrayMovie.forEach((genreStat) => {
      user.stats.movie.genres.push(genreStat);
    });
    genreArrayTv.forEach((genreStat) => {
      user.stats.tv.genres.push(genreStat);
    });
    user.stats.movie.overview = overviewStatsMovie;
    user.stats.tv.overview = overviewStatsTv;

    await user.save();
  } catch (error) {
    console.error("Error generating user stats:", error);
  }
};

export const generateAllUserStats = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const users = await User.find({}).exec();
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

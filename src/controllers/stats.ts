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
    const overviewStats: any = {
      totalMovies: 0,
      totalShows: 0,
      episodesWatched: 0,
      daysWatched: 0,
      daysPlanned: 0,
      daysWatchedMovie: 0,
      daysPlannedMovie: 0,
      daysWatchedTv: 0,
      daysPlannedTv: 0,
      meanScore: 0,
      score: Array(10).fill({ count: 0, hoursWatched: 0, meanScore: 0 }),
      epsCount: [],
      formatDist: {},
      statusDist: {},
      countryDist: {},
      releaseYear: {},
      watchYear: {},
    };

    const genreStats: Record<string, any> = {};

    const scores: number[] = [];
    let totalHoursWatched = 0;

    entries.forEach((entry) => {
      const { mediaType, status, score, progress, data } = entry;

      if (mediaType === "movie") overviewStats.totalMovies += 1;
      if (mediaType === "tv") overviewStats.totalShows += 1;
      if (status === "completed") overviewStats.episodesWatched += progress;

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
        overviewStats.daysWatched += hoursWatched / 24;
        if (mediaType === MediaType.movie) {
          overviewStats.daysWatchedMovie += hoursWatched / 24;
        } else {
          overviewStats.daysWatchedTv += hoursWatched / 24;
        }
        if (score) {
          overviewStats.score[score - 1].count += 1;
          overviewStats.score[score - 1].hoursWatched += hoursWatched;
          scores.push(score);
        }
      } else if (status === MediaStatus.planning) {
        let epsPlanned = 1;
        if (mediaType == MediaType.tv && data?.number_of_episodes) {
          epsPlanned = data.number_of_episodes;
        }
        const hoursPlanned = epsPlanned * episodeDuration;
        overviewStats.daysPlanned += hoursPlanned / 24;
        if (mediaType === MediaType.movie) {
          overviewStats.daysPlannedMovie += hoursPlanned / 24;
        } else {
          overviewStats.daysPlannedTv += hoursPlanned / 24;
        }
      }

      // Update distributions (formatDist, statusDist, etc.)
      if (!overviewStats.formatDist[mediaType]) {
        overviewStats.formatDist[mediaType] = {
          count: 0,
          hoursWatched: 0,
          meanScore: 0,
        };
      }
      overviewStats.formatDist[mediaType].count += 1;
      overviewStats.formatDist[mediaType].hoursWatched += totalHoursWatched;
      overviewStats.formatDist[mediaType].meanScore =
        calculateMeanScore(scores);

      if (!overviewStats.statusDist[status]) {
        overviewStats.statusDist[status] = {
          count: 0,
          hoursWatched: 0,
          meanScore: 0,
        };
      }
      overviewStats.statusDist[status].count += 1;
      overviewStats.statusDist[status].hoursWatched += totalHoursWatched;
      overviewStats.statusDist[status].meanScore = calculateMeanScore(scores);

      // Genre stats
      if (status === MediaStatus.completed && data && data.genres) {
        const hoursWatched = progress * episodeDuration;
        data.genres.forEach((genre: { id: number; name: string }) => {
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
          genreStats[genre.id].list.push({
            title: entry.title,
            posterPath: entry.poster,
            id: Number(entry.mediaid),
            mediaType,
          });
          if (score) {
            const genreScores: any = genreStats[genre.id].list.map(
              (item: any) => item.meanScore
            );
            genreScores.push(score);
            genreStats[genre.id].meanScore = calculateMeanScore(genreScores);
          }
        });
      }
    });
    overviewStats.meanScore = calculateMeanScore(scores);

    // Save stats
    await User.updateOne(
      { _id: userId },
      { $set: { "stats.genres": [], "stats.overview": overviewStats } }
    );
    const genreArray = Object.values(genreStats);
    genreArray.forEach((genreStat) => {
      user.stats.genres.push(genreStat);
    });
    user.stats.overview = overviewStats;

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

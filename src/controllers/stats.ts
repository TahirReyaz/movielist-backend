import mongoose from "mongoose";
import express from "express";

import { UserSchema } from "../db/users";
import { ListEntrySchema } from "../db/listEntries";

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
  return sum / scores.length;
};

export const generateUserStats = async (userId: string) => {
  try {
    const user = await User.findById(userId).exec();
    if (!user) throw new Error("User not found");

    const entries = await ListEntry.find({ userid: userId }).exec();

    // Initialize stats
    const stats: any = {
      totalMovies: 0,
      totalShows: 0,
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

    const scores: number[] = [];
    let totalHoursWatched = 0;

    entries.forEach((entry) => {
      const { mediaType, status, score, progress } = entry;

      if (mediaType === "movie") stats.totalMovies += 1;
      if (mediaType === "tv") stats.totalShows += 1;
      if (status === "completed") stats.episodesWatched += progress;

      if (status === "watching" || status === "completed") {
        const hoursWatched = progress * 1; // Assume each episode is 30 minutes
        totalHoursWatched += hoursWatched;
        stats.daysWatched += hoursWatched / 24;
        if (score) {
          stats.score[score - 1].count += 1;
          stats.score[score - 1].hoursWatched += hoursWatched;
          scores.push(score);
        }
      } else if (status === "planning") {
        const hoursPlanned = progress * 1;
        stats.daysPlanned += hoursPlanned / 24;
      }

      // Update distributions (formatDist, statusDist, etc.)
      if (!stats.formatDist[mediaType]) {
        stats.formatDist[mediaType] = {
          count: 0,
          hoursWatched: 0,
          meanScore: 0,
        };
      }
      stats.formatDist[mediaType].count += 1;
      stats.formatDist[mediaType].hoursWatched += totalHoursWatched;
      stats.formatDist[mediaType].meanScore = calculateMeanScore(scores);

      if (!stats.statusDist[status]) {
        stats.statusDist[status] = { count: 0, hoursWatched: 0, meanScore: 0 };
      }
      stats.statusDist[status].count += 1;
      stats.statusDist[status].hoursWatched += totalHoursWatched;
      stats.statusDist[status].meanScore = calculateMeanScore(scores);
    });

    stats.meanScore = calculateMeanScore(scores);

    user.stats.overview = stats;
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

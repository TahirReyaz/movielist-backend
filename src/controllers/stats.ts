import mongoose from "mongoose";
import express from "express";

import { Distribution, StaffStat, UserModel, getUserById } from "../db/users";
import { getEntries } from "../db/listEntries";
import { MediaStatus, MediaType } from "../constants/misc";
import {
  calculateCountryDist,
  calculateGenreStats,
  calculateStatusDist,
  generateStaffStats,
  generateReleaseYearStats,
  generateTagsStats,
  generateWatchYearStats,
  calculateMeanScore,
} from "../helpers/stats";

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
      score: [],
      epsCount: [],
      formatDist: [],
      statusDist: [],
      countryDist: [],
      releaseYear: [],
      watchYear: [],
    };
    let overviewStatsTv: any = {
      count: 0,
      episodesWatched: 0,
      daysWatched: 0,
      daysPlanned: 0,
      meanScore: 0,
      score: [],
      epsCount: [],
      formatDist: [],
      statusDist: [],
      countryDist: [],
      releaseYear: [],
      watchYear: [],
    };

    let statusDistMovie: Distribution[] = [],
      statusDistTv: Distribution[] = [],
      countryDistMovie: Distribution[] = [],
      countryDistTv: Distribution[] = [],
      releaseYearStatsMovie: Distribution[] = [],
      releaseYearStatsTv: Distribution[] = [],
      watchYearStatsMovie: Distribution[] = [],
      watchYearStatsTv: Distribution[] = [],
      genreStatsMovie: Record<string, any> = {},
      genreStatsTv: Record<string, any> = {},
      tagStatsMovie: Record<string, any> = {},
      tagStatsTv: Record<string, any> = {},
      castStatsMovie: Record<string, any> = {},
      castStatsTv: Record<string, any> = {},
      crewStatsMovie: Record<string, any> = {},
      crewStatsTv: Record<string, any> = {};

    let totalHoursWatched = 0;

    // Go over each entry and generate stats
    entries.forEach((entry) => {
      try {
        const { mediaType, status, progress, data, title, poster, mediaid } =
          entry;
        const score = data?.vote_average ?? 0;

        // Pick the stats to update
        let overviewStats = overviewStatsMovie,
          statusDist: Distribution[] = statusDistMovie,
          countryDist: Distribution[] = countryDistMovie,
          releaseYearStats: Distribution[] = releaseYearStatsMovie,
          watchYearStats: Distribution[] = watchYearStatsMovie,
          genreStats: Record<string, any> = genreStatsMovie,
          tagStats: Record<string, any> = tagStatsMovie,
          castStats: Record<string, any> = castStatsMovie,
          crewStats: Record<string, any> = crewStatsMovie;

        if (mediaType == MediaType.tv) {
          overviewStats = overviewStatsTv;
          releaseYearStats = releaseYearStatsTv;
          watchYearStats = watchYearStatsTv;
          statusDist = statusDistTv;
          countryDist = countryDistTv;
          genreStats = genreStatsTv;
          tagStats = tagStatsTv;
          castStats = castStatsTv;
          crewStats = crewStatsTv;
        }

        if (status === "completed") {
          overviewStats.count += 1;
          overviewStats.meanScore = calculateMeanScore(
            overviewStats.meanScore,
            score,
            overviewStats.count
          );
        }
        if (mediaType === MediaType.tv) {
          overviewStats.episodesWatched += progress;
        }

        // Set episode duration
        let episodeDuration = 60;
        if (mediaType === MediaType.movie) {
          episodeDuration = data?.runtime ? data.runtime : 60;
        } else {
          episodeDuration = data?.episode_run_time ? data.episode_run_time : 40;
        }
        episodeDuration /= 60;

        // Calculate days watched and planned
        const hoursWatched = progress * episodeDuration;

        let epsPlanned = 1;
        if (mediaType == MediaType.tv && data?.number_of_episodes) {
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
          score,
        });

        // Country Distribution
        if (status === MediaStatus.completed && data?.origin_country) {
          countryDist = calculateCountryDist({
            countryDist,
            hoursWatched,
            countries: data.origin_country,
            score,
          });
        }

        // Release year stats
        if (
          status === MediaStatus.completed &&
          (data?.release_date || data?.first_air_date)
        ) {
          releaseYearStats = generateReleaseYearStats({
            stats: releaseYearStats,
            hoursWatched,
            releaseDate: data.release_date || data.first_air_date,
            score,
          });
        }

        // Watch year stats
        if (status === MediaStatus.completed && entry.endDate?.length > 0) {
          watchYearStats = generateWatchYearStats({
            stats: watchYearStats,
            hoursWatched,
            watchDate: entry.endDate,
            score,
          });
        }

        // Genre stats
        if (status === MediaStatus.completed && data?.genres) {
          genreStats = calculateGenreStats({
            genreStats,
            mediaType,
            mediaid: Number(mediaid),
            title,
            poster,
            genres: data.genres,
            hoursWatched,
            score,
          });
        }

        // Tag stats
        if (status === MediaStatus.completed && data?.tags) {
          tagStats = generateTagsStats({
            tagStats,
            mediaType,
            mediaid: Number(mediaid),
            title,
            poster,
            tags: data.tags,
            hoursWatched,
            score,
          });
        }

        // Cast stats
        if (status === MediaStatus.completed && data?.cast) {
          castStats = generateStaffStats({
            stats: castStats,
            mediaType,
            mediaid: Number(mediaid),
            title,
            poster,
            staff: data.cast,
            hoursWatched,
            score,
          });
        }

        // Crew stats
        if (status === MediaStatus.completed && data?.crew) {
          crewStats = generateStaffStats({
            stats: crewStats,
            mediaType,
            mediaid: Number(mediaid),
            title,
            poster,
            staff: data.crew,
            hoursWatched,
            score,
          });
        }

        // Assign the calculated stats accoding to the media type
        if (mediaType == MediaType.movie) {
          statusDistMovie = statusDist;
          countryDistMovie = countryDist;
          releaseYearStatsMovie = releaseYearStats;
          watchYearStatsMovie = watchYearStats;
          overviewStatsMovie = overviewStats;
          genreStatsMovie = genreStats;
          tagStatsMovie = tagStats;
        } else {
          statusDistTv = statusDist;
          countryDistTv = countryDist;
          releaseYearStatsTv = releaseYearStats;
          watchYearStatsTv = watchYearStats;
          overviewStatsTv = overviewStats;
          genreStatsTv = genreStats;
          tagStatsTv = tagStats;
        }
      } catch (error) {
        console.log(
          "Error while stats of ",
          entry.mediaType,
          entry.mediaid,
          error
        );
      }
    });

    // Save stats
    const genreArrayMovie = Object.values(genreStatsMovie).slice(0, 100);
    const genreArrayTv = Object.values(genreStatsTv).slice(0, 100);
    const castArrayMovie = Object.values(castStatsMovie).slice(0, 100);
    const castArrayTv = Object.values(castStatsTv).slice(0, 100);
    const crewArrayMovie: StaffStat[] = Object.values(crewStatsMovie).slice(
      0,
      100
    );
    const crewArrayTv: StaffStat[] = Object.values(crewStatsTv).slice(0, 100);
    const tagArrayMovie = Object.values(tagStatsMovie).slice(0, 100);
    const tagArrayTv = Object.values(tagStatsTv).slice(0, 100);

    await UserModel.updateOne(
      { _id: userId },
      {
        $set: {
          // Reset the genres arrays to empty
          "stats.movie.genres": [],
          "stats.tv.genres": [],
          "stats.movie.tags": [],
          "stats.tv.tags": [],
          "stats.movie.cast": [],
          "stats.tv.cast": [],
          "stats.movie.crew": [],
          "stats.tv.crew": [],
          "stats.movie.overview.statusDist": [],
          "stats.movie.overview.countryDist": [],
          "stats.movie.overview.releaseYear": [],
          "stats.movie.overview.watchYear": [],
          "stats.tv.overview.statusDist": [],
          "stats.tv.overview.countryDist": [],
          "stats.tv.overview.releaseYear": [],
          "stats.tv.overview.watchYear": [],
        },
      }
    );

    await UserModel.updateOne(
      { _id: userId },
      {
        $set: {
          "stats.movie.overview": {
            ...overviewStatsMovie,
            statusDist: statusDistMovie,
            countryDist: countryDistMovie,
            releaseYear: releaseYearStatsMovie,
            watchYear: watchYearStatsMovie,
          },
          "stats.tv.overview": {
            ...overviewStatsTv,
            statusDist: statusDistTv,
            countryDist: countryDistTv,
            releaseYear: releaseYearStatsTv,
            watchYear: watchYearStatsTv,
          },
        },
        $push: {
          "stats.movie.genres": { $each: genreArrayMovie },
          "stats.tv.genres": { $each: genreArrayTv },
          "stats.movie.tags": { $each: tagArrayMovie },
          "stats.tv.tags": { $each: tagArrayTv },
          "stats.movie.cast": { $each: castArrayMovie },
          "stats.tv.cast": { $each: castArrayTv },
          "stats.movie.crew": { $each: crewArrayMovie },
          "stats.tv.crew": { $each: crewArrayTv },
        },
      }
    );
  } catch (error) {
    console.error("Error generating user stats:", userId, error);
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

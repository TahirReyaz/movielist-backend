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
          score: entry.data?.vote_average ?? 0,
        });

        // Country Distribution
        if (status === MediaStatus.completed && data?.production_countries) {
          countryDist = calculateCountryDist({
            countryDist,
            hoursWatched,
            countries: data.production_countries,
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
          });
        }

        // Watch year stats
        if (status === MediaStatus.completed && entry.endDate?.length > 0) {
          watchYearStats = generateWatchYearStats({
            stats: watchYearStats,
            hoursWatched,
            watchDate: entry.endDate,
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
            score: data?.vote_average ?? 0,
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
            score: data?.vote_average ?? 0,
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
    const genreArrayMovie = Object.values(genreStatsMovie);
    const genreArrayTv = Object.values(genreStatsTv);
    const castArrayMovie = Object.values(castStatsMovie);
    const castArrayTv = Object.values(castStatsTv);
    const crewArrayMovie: StaffStat[] = Object.values(crewStatsMovie);
    const crewArrayTv: StaffStat[] = Object.values(crewStatsTv);
    const tagArrayMovie = Object.values(tagStatsMovie);
    const tagArrayTv = Object.values(tagStatsTv);

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

import mongoose from "mongoose";
import express from "express";
import lodash from "lodash";

import { UserModel, getUserById, getUserByUsername } from "../db/users";
import { getEntries } from "../db/listEntries";
import {
  MediaStatus,
  MediaType,
  mediaTypeEnum,
  statTypeEnum,
} from "../constants/misc";
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
import {
  Distribution,
  createOverviewStats,
  deleteOverviewStatsByUseridAndMediaType,
  getOverviewStatsByUseridAndMediaType,
} from "../db/overviewStats";
import {
  TOtherStat,
  createOtherStats,
  deleteOtherStatsByUserid,
  getOtherStatsFromDB,
} from "../db/otherStats";

export const getOverviewStats = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const { mediaType } = req.params;

    const userid = lodash.get(req, "identity._id") as string;

    if (!mediaType || !mediaTypeEnum.includes(mediaType)) {
      return res.status(403).send("Wrong Media Type");
    }

    const stats = await getOverviewStatsByUseridAndMediaType(userid, mediaType);

    return res.status(200).json(stats);
  } catch (error) {
    console.error(error);
    return res.status(500).send({ message: "Some error occurred" });
  }
};

export const getOtherStats = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const { username, mediaType, statType } = req.params;

    const user = await getUserByUsername(username);

    if (!user) {
      return res.status(404).send("User not found");
    }

    const userid = user._id.toString();

    if (
      !username ||
      !mediaTypeEnum.includes(mediaType) ||
      !statTypeEnum.includes(statType)
    ) {
      return res.status(403).send("Wrong Media or Stat Type or Missing User");
    }

    const stats = await getOtherStatsFromDB(userid, mediaType, statType);

    return res.status(200).json(stats);
  } catch (error) {
    console.error(error);
    return res.status(500).send({ message: "Some error occurred" });
  }
};

export const updateStats = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const userid = lodash.get(req, "identity._id") as mongoose.Types.ObjectId;

    await generateUserStats(userid.toString());

    return res.status(200).send({ message: "Generated user stats" });
  } catch (error) {
    console.error(error);
    return res.status(500).send({ message: "Some error occurred" });
  }
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
        const episodeDuration = (data?.runtime ? data.runtime : 60) / 60;

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
        if (status === MediaStatus.completed && data?.release_date) {
          releaseYearStats = generateReleaseYearStats({
            stats: releaseYearStats,
            hoursWatched,
            releaseDate: data.release_date,
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
            mediaid,
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
            mediaid,
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
            mediaid,
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
            mediaid,
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
        console.error(
          "Error while stats of ",
          entry.mediaType,
          entry.mediaid,
          error
        );
      }
    });

    // Save stats
    const genreArrayMovie = Object.values(genreStatsMovie).slice(0, 50);
    const genreArrayTv = Object.values(genreStatsTv).slice(0, 50);
    const castArrayMovie = Object.values(castStatsMovie).slice(0, 50);
    const castArrayTv = Object.values(castStatsTv).slice(0, 50);
    const crewArrayMovie: TOtherStat[] = Object.values(crewStatsMovie).slice(
      0,
      50
    );
    const crewArrayTv: TOtherStat[] = Object.values(crewStatsTv).slice(0, 50);
    const tagArrayMovie = Object.values(tagStatsMovie).slice(0, 50);
    const tagArrayTv = Object.values(tagStatsTv).slice(0, 50);

    await deleteOtherStatsByUserid(userId);
    await Promise.all(
      genreArrayMovie.map((genMov) => {
        createOtherStats({
          ...genMov,
          user: userId,
          mediaType: "movie",
          type: "genre",
        });
      })
    );
    await Promise.all(
      genreArrayTv.map((genTV) => {
        createOtherStats({
          ...genTV,
          user: userId,
          mediaType: "tv",
          type: "genre",
        });
      })
    );
    await Promise.all(
      castArrayMovie.map((castMov) => {
        createOtherStats({
          ...castMov,
          user: userId,
          mediaType: "movie",
          type: "cast",
        });
      })
    );
    await Promise.all(
      castArrayTv.map((castTV) => {
        createOtherStats({
          ...castTV,
          user: userId,
          mediaType: "tv",
          type: "cast",
        });
      })
    );

    await Promise.all(
      crewArrayMovie.map((crewMov) => {
        createOtherStats({
          ...crewMov,
          user: userId,
          mediaType: "movie",
          type: "crew",
        });
      })
    );
    await Promise.all(
      crewArrayTv.map((crewTV) => {
        createOtherStats({
          ...crewTV,
          user: userId,
          mediaType: "tv",
          type: "crew",
        });
      })
    );
    await Promise.all(
      tagArrayMovie.map((tagMov) => {
        createOtherStats({
          ...tagMov,
          user: userId,
          mediaType: "movie",
          type: "tag",
        });
      })
    );
    await Promise.all(
      tagArrayTv.map((tagTV) => {
        createOtherStats({
          ...tagTV,
          user: userId,
          mediaType: "tv",
          type: "tag",
        });
      })
    );

    await deleteOverviewStatsByUseridAndMediaType(userId, "tv");
    await deleteOverviewStatsByUseridAndMediaType(userId, "movie");

    await createOverviewStats({
      user: userId,
      mediaType: "tv",
      ...overviewStatsTv,
      statusDist: statusDistTv,
      countryDist: countryDistTv,
      releaseYear: releaseYearStatsTv,
      watchYear: watchYearStatsTv,
    });
    await createOverviewStats({
      user: userId,
      mediaType: "movie",
      ...overviewStatsMovie,
      statusDist: statusDistMovie,
      countryDist: countryDistMovie,
      releaseYear: releaseYearStatsMovie,
      watchYear: watchYearStatsMovie,
    });
  } catch (error) {
    console.error("Error generating user stats:", userId.toString(), error);
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

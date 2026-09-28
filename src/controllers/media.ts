import express from "express";
import lodash from "lodash";
import mongoose from "mongoose";

import { isMediaType } from "../Interfaces/media";
import { isSeason, searchMediaPage } from "../helpers/search";
import { getUserById, searchUsers } from "../db/users";
import { getEntries, getEntry } from "../db/listEntries";
import { removeAnime, translateBulkType } from "../helpers/tmdb";
import tmdbClient from "../utils/api";
import { logTMDBError } from "../utils/logger";
import { getFollowers } from "../db/followers";

export const getBulkMedia = async (
  req: express.Request<
    { mediaType: string; bulktype: keyof typeof translateBulkType },
    any,
    any,
    any
  >,
  res: express.Response
) => {
  try {
    const { mediaType, bulktype } = req.params;
    const { page } = req.query;
    const translatedBulkType = translateBulkType[bulktype];

    const response = await tmdbClient.get(
      `/${mediaType}/${translatedBulkType}`,
      { params: { page } }
    );

    const results = response.data?.results;

    const filteredResults = removeAnime(results);

    res.status(200).json(filteredResults);
  } catch (error) {
    console.error("Error getting bulk media", error);
    console.error({ bulkType: req.params.bulktype });
    return res.sendStatus(500);
  }
};

export const getMediaDetail = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const { mediaType, mediaid } = req.params;
    const userid = lodash.get(req, "identity._id") as mongoose.Types.ObjectId;

    const response = await tmdbClient.get(`/${mediaType}/${mediaid}`);

    // Only movies have an entry here; for tv the entries live on seasons.
    const entry =
      userid && mediaType === "movie"
        ? await getEntry({ owner: userid, mediaType, mediaid })
        : null;

    if (!entry) {
      return res.status(200).json(response.data);
    }

    return res.status(200).json({ ...response.data, entry });
  } catch (error) {
    logTMDBError(req.path, error, "media details", req);
    return res.status(500).send({ message: error });
  }
};

export const getSeasonDetails = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const { mediaType, mediaid, seasonNumber } = req.params;
    const userid = lodash.get(req, "identity._id") as mongoose.Types.ObjectId;

    const response = await tmdbClient.get(
      `/${mediaType}/${mediaid}/season/${seasonNumber}`
    );

    const seasonDetails = {
      ...response.data,
      number_of_episodes: response.data.episodes?.length,
    };

    const entry = userid
      ? await getEntry({
          owner: userid,
          mediaType,
          mediaid: `${mediaid}-${seasonNumber}`,
        })
      : null;

    if (!entry) {
      return res.status(200).json(seasonDetails);
    }

    return res.status(200).json({ ...seasonDetails, entry });
  } catch (error) {
    logTMDBError(req.path, error, "season details", req);
    return res
      .status(500)
      .send({ message: "Error occurred while fetching season details" });
  }
};

export const getMediaVideos = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const { mediaType, mediaid } = req.params;
    const response = await tmdbClient.get(`/${mediaType}/${mediaid}/videos`);

    return res.status(200).json(response.data.results);
  } catch (error) {
    console.error("Error getting media videos", error);
    return res.status(500).send({ message: error });
  }
};

export const getMediaTags = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const { mediaType, mediaid } = req.params;
    const response = await tmdbClient.get(`/${mediaType}/${mediaid}/keywords`);

    res.status(200).json({
      id: response.data.id,
      tags: mediaType == "tv" ? response.data.results : response.data.keywords,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).send({ message: error });
  }
};

export const getGenreList = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const { mediaType } = req.params;
    const response = await tmdbClient.get(`/genre/${mediaType}/list`);

    res.status(200).json(response.data);
  } catch (error) {
    console.error(error);
    return res.status(500).send({ message: error });
  }
};

export const getMediaCredits = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const { mediaType, mediaid, season } = req.params;
    const seasonNumber = season ? parseInt(season) : 999;
    const response =
      seasonNumber < 999
        ? await tmdbClient.get(
            `/${mediaType}/${mediaid}/season/${seasonNumber}/credits`
          )
        : await tmdbClient.get(`/${mediaType}/${mediaid}/credits`);

    res.status(200).json({
      id: response.data.id,
      characters: response.data.cast,
      crew: response.data.crew,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).send({ message: error });
  }
};

export const getMediaRecommendations = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const { mediaType, mediaid } = req.params;
    const response = await tmdbClient.get(`/${mediaType}/${mediaid}/similar`);

    res.status(200).json({
      id: response.data.mediaid,
      recommendations: response.data.results,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).send({ message: error });
  }
};

export const getMediaRelations = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const { collectionId, mediaid } = req.params;
    const response = await tmdbClient.get(`/collection/${collectionId}`);

    const collection = response.data?.parts;

    const relations = collection?.filter(
      (media: any) => media?.id?.toString() !== mediaid
    );

    res.status(200).json(relations);
  } catch (error) {
    console.error(error);
    return res.status(500).send({ message: error });
  }
};

export const searchMulti = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const { query } = req.params;
    const response = await tmdbClient.get(`/search/multi`, {
      params: { query },
    });

    const users = await searchUsers(query);

    let movies: any[] = [];
    let tv: any[] = [];
    const people: any[] = [];

    response.data.results.forEach((item: any) => {
      if (item.media_type === "movie") {
        movies.push(item);
      } else if (item.media_type === "tv") {
        tv.push(item);
      } else if (item.media_type === "person") {
        people.push(item);
      }
    });

    tv = removeAnime(tv);
    movies = removeAnime(movies);

    const categorizedResults = {
      movies,
      tv,
      people,
      users,
    };

    res.status(200).json(categorizedResults);
  } catch (error) {
    console.error(error);
    return res.status(500).send({ message: error });
  }
};

/**
 * GET /search/:mediaType?query=&page=&year=&season=&genres=
 *
 * movie / tv: 1 TMDB request per page (at most 3 for a text search that also
 * filters by genre/season). Returns { results, page, nextPage, totalPages,
 * totalResults }. Load more by passing `page=nextPage`.
 */
export const searchMedia = async (
  req: express.Request<
    { mediaType: string },
    any,
    any,
    {
      query?: string;
      include_adult?: string;
      language?: string;
      page?: string;
      year?: string;
      season?: string;
      genres?: string;
    }
  >,
  res: express.Response
) => {
  try {
    const { mediaType } = req.params;
    const { query, include_adult, language, page, year, season, genres } =
      req.query;

    if (mediaType == "staff") {
      const response = await tmdbClient.get(`/search/person`, {
        params: { query, page: page || "1" },
      });
      return res.status(200).json(response.data);
    } else if (mediaType == "user") {
      const users = await searchUsers(query ?? "");
      return res.status(200).json(users);
    }

    if (!isMediaType(mediaType)) {
      return res.status(400).json({ message: "Invalid media type" });
    }

    const yearNum = Number(year);
    const genreIds = (genres ?? "")
      .split(",")
      .map((g) => Number(g))
      .filter((g) => Number.isInteger(g) && g > 0);

    const hasFilter =
      !!query?.trim() || genreIds.length > 0 || !!year || isSeason(season);
    if (!hasFilter) {
      return res.status(400).json({ message: "Provide a query or a filter" });
    }

    const result = await searchMediaPage(mediaType, {
      query,
      page: Number(page) || 1,
      year: Number.isInteger(yearNum) && yearNum >= 1800 ? yearNum : undefined,
      season: isSeason(season) ? season : undefined,
      genres: genreIds,
      includeAdult: include_adult === "true",
      language: language || undefined,
    });

    return res.status(200).json(result);
  } catch (error) {
    logTMDBError(req.path, error, "search results", req);
    return res.status(500).json({ message: "Search failed" });
  }
};

export const getStatusDistributionByMediaId = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const { mediaid } = req.params;
    const entries = await getEntries({ mediaid });
    const statusMap = new Map();
    entries.forEach((entry) => {
      const status = entry.status;
      if (statusMap.has(status)) {
        statusMap.set(status, statusMap.get(status) + 1);
      } else {
        statusMap.set(status, 1);
      }
    });

    const statusArray = Array.from(statusMap, ([name, value]) => ({
      title: name,
      count: value,
    }));

    return res.status(200).json(statusArray);
  } catch (error) {
    console.error(error);
    return res.status(500).send({ message: "Databse error" });
  }
};

export const getFollowingStatusByMediaid = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const { mediaid } = req.params;
    const userid = lodash.get(req, "identity._id") as mongoose.Types.ObjectId;

    const followers = await getFollowers({ user: userid });

    const dist: {
      username: string;
      avatar?: string;
      status: string;
      score: number;
    }[] = [];

    followers?.forEach(async (follower) => {
      const entries = await getEntries({ owner: follower.target, mediaid });
      if (entries && entries.length > 0) {
        const entry = entries[0];

        // Type assertion to tell TypeScript that entry.owner is not ObjectId but a populated owner
        const populatedOwner = entry.owner as unknown as {
          username: string;
          avatar?: string;
        };

        if (entry?.owner) {
          dist.push({
            username: populatedOwner.username,
            avatar: populatedOwner.avatar,
            status: entry.status,
            score: entry.score,
          });
        }
      }
    });

    return res.status(200).json(dist);
  } catch (error) {
    console.error(error);
    return res.status(500).send({ message: "Internal server error" });
  }
};

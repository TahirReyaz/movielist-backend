import express from "express";
import { AxiosResponse } from "axios";
import lodash from "lodash";
import mongoose from "mongoose";

import { Season } from "../constants/types";
import { getSeason } from "../helpers/time";
import { getUserById, searchUsers } from "../db/users";
import { getEntries } from "../db/listEntries";
import { removeAnime, translateBulkType } from "../helpers/tmdb";
import tmdbClient from "../utils/api";
import { logTMDBError } from "../utils/logger";
import { getFollowers } from "db/followers";

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
    const response = await tmdbClient.get(`/${mediaType}/${mediaid}`);

    return res.status(200).json(response.data);
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
    const response = await tmdbClient.get(
      `/${mediaType}/${mediaid}/season/${seasonNumber}`
    );

    return res.status(200).json({
      ...response.data,
      number_of_episodes: response.data.episodes?.length,
    });
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

export const searchMedia = async (
  req: express.Request<
    { mediaType: string },
    any,
    any,
    {
      query?: string;
      include_adult?: boolean;
      language?: string;
      page?: string;
      year?: string;
      season?: Season;
      genres?: string;
    }
  >,
  res: express.Response
) => {
  try {
    const { mediaType } = req.params;
    const { query, include_adult, language, page, year, season, genres } =
      req.query;

    const searchParams = {
      query,
      page: page && page != "" ? page : "1",
    };

    if (mediaType == "staff") {
      const response = await tmdbClient.get(`/search/person`, {
        params: searchParams,
      });
      return res.status(200).json(response.data);
    } else if (mediaType == "user") {
      const users = await searchUsers(query);
      return res.status(200).json(users);
    }

    if (mediaType !== "movie" && mediaType !== "tv") {
      return res.status(400).json({ message: "Invalid media type" });
    }

    const discoverParams = {
      include_adult: !!include_adult,
      page: page && page != "" ? page : "1",
      ...(language && { language }),
      ...(year && { primary_release_year: year }),
      ...(genres && { with_genres: genres }),
    };

    const searchResponses: AxiosResponse[] = await Promise.all(
      Array.from({ length: 100 }, (_, page) => {
        const nextPage = page + 1;
        searchParams.page = nextPage.toString();
        return tmdbClient.get(`/search/${mediaType}`, { params: searchParams });
      })
    );
    const discoverResponses: AxiosResponse[] = await Promise.all(
      Array.from({ length: 100 }, (_, page) => {
        const nextPage = page + 1;
        discoverParams.page = nextPage.toString();
        return tmdbClient.get(`/discover/${mediaType}`, {
          params: discoverParams,
        });
      })
    );
    const searchResults = searchResponses.flatMap(
      (response) => response.data.results
    );
    const discoverResults = discoverResponses.flatMap(
      (response) => response.data.results
    );

    let filteredResults;
    if (searchResults.length === 0 || !query || query === "") {
      filteredResults = discoverResults;
    } else if (
      discoverResults.length === 0 ||
      ((!genres || genres === "") && (!year || year === ""))
    ) {
      filteredResults = searchResults;
    } else {
      filteredResults = searchResults.filter((searchResult: any) =>
        discoverResults.some(
          (discoverResult: any) => discoverResult.id === searchResult.id
        )
      );
    }

    // Check if the season parameter is provided
    if (season) {
      // Filter the results based on the season
      filteredResults = filteredResults.filter((result: any) => {
        return result.release_date && getSeason(result.release_date) === season;
      });
    }

    res.status(200).json({ results: filteredResults });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "SOMETHING WENT WRONG" });
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

    const user = await getUserById(userid.toString());
    const followers = await getFollowers({ user: userid });

    const dist: {
      username: string;
      avatar?: string;
      status: string;
      score: number;
    }[] = [];

    if (user.following) {
      for (const followingUserId of user.following) {
        const entries = await getEntries({ owner: followingUserId, mediaid });
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
      }
    }

    return res.status(200).json(dist);
  } catch (error) {
    console.error(error);
    return res.status(500).send({ message: "Internal server error" });
  }
};

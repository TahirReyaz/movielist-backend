import express from "express";
import axios, { AxiosResponse, AxiosResponseHeaders } from "axios";

import { Season } from "../constants/types";
import { getSeason } from "../helpers/time";
import { searchUsers } from "../db/users";
import { removeAnime, translateBulkType } from "../helpers/tmdb";

const TMDB_ENDPOINT = "https://api.themoviedb.org/3";
const TMDB_API_KEY = process.env.TMDB_API_KEY;

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

    const response = await axios.get(
      `${TMDB_ENDPOINT}/${mediaType}/${translatedBulkType}`,
      {
        params: {
          api_key: TMDB_API_KEY,
          page,
        },
      }
    );

    const results = response.data?.results;

    const filteredResults = removeAnime(results);

    res.status(200).json(filteredResults);
  } catch (error) {
    console.error(error);
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
    const response = await axios.get(
      `${TMDB_ENDPOINT}/${mediaType}/${mediaid}`,
      {
        params: {
          api_key: TMDB_API_KEY,
        },
      }
    );
    try {
      res.status(200).json(response.data);
    } catch (error) {
      console.error(error);
      res.send({ message: "SOMETHING WENT WRONG" });
    }
  } catch (error) {
    console.error(error);
    return res.status(400).send({ message: error });
  }
};

export const getMediaTags = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const { mediaType, mediaid } = req.params;
    const response = await axios.get(
      `${TMDB_ENDPOINT}/${mediaType}/${mediaid}/keywords`,
      {
        params: {
          api_key: TMDB_API_KEY,
        },
      }
    );
    res.status(200).json({
      id: response.data.id,
      tags: mediaType == "tv" ? response.data.results : response.data.keywords,
    });
  } catch (error) {
    console.error(error);
    return res.status(400).send({ message: error });
  }
};

export const getGenreList = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const { mediaType } = req.params;
    const response = await axios.get(
      `${TMDB_ENDPOINT}/genre/${mediaType}/list`,
      {
        params: {
          api_key: TMDB_API_KEY,
        },
      }
    );
    res.status(200).json(response.data);
  } catch (error) {
    console.error(error);
    return res.status(400).send({ message: error });
  }
};

export const getMediaCharacters = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const { mediaType, mediaid } = req.params;
    const response = await axios.get(
      `${TMDB_ENDPOINT}/${mediaType}/${mediaid}/credits`,
      {
        params: {
          api_key: TMDB_API_KEY,
        },
      }
    );

    res.status(200).json({
      id: response.data.id,
      characters: response.data.cast,
      crew: response.data.crew,
    });
  } catch (error) {
    console.error(error);
    return res.status(400).send({ message: error });
  }
};

export const getMediaRecommendations = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const { mediaType, mediaid } = req.params;
    const response = await axios.get(
      `${TMDB_ENDPOINT}/${mediaType}/${mediaid}/similar`,
      {
        params: {
          api_key: TMDB_API_KEY,
        },
      }
    );

    res.status(200).json({
      id: response.data.mediaid,
      recommendations: response.data.results,
    });
  } catch (error) {
    console.error(error);
    return res.status(400).send({ message: error });
  }
};

export const getMediaRelations = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const { collectionId, mediaid } = req.params;
    const response = await axios.get(
      `${TMDB_ENDPOINT}/collection/${collectionId}`,
      {
        params: {
          api_key: TMDB_API_KEY,
        },
      }
    );

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
    const response = await axios.get(`${TMDB_ENDPOINT}/search/multi`, {
      params: {
        query,
        api_key: TMDB_API_KEY,
      },
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
    return res.status(400).send({ message: error });
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
      api_key: TMDB_API_KEY,
      query,
      page: page && page != "" ? page : "1",
    };

    if (mediaType == "staff") {
      const response = await axios.get(`${TMDB_ENDPOINT}/search/person`, {
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
      api_key: TMDB_API_KEY,
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
        const pageUrl = `${TMDB_ENDPOINT}/search/${mediaType}`;
        return axios.get(pageUrl, { params: searchParams });
      })
    );
    const discoverResponses: AxiosResponse[] = await Promise.all(
      Array.from({ length: 100 }, (_, page) => {
        const nextPage = page + 1;
        discoverParams.page = nextPage.toString();
        const pageUrl = `${TMDB_ENDPOINT}/discover/${mediaType}`;
        return axios.get(pageUrl, { params: discoverParams });
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

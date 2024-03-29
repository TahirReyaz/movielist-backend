import express from "express";
import axios from "axios";

import { Season } from "../constants/types";
import { getSeason } from "../helpers/time";
import { searchUsers } from "../db/users";

const TMDB_ENDPOINT = "https://api.themoviedb.org/3";
const TMDB_API_KEY = process.env.TMDB_API_KEY;

export const getBulkMedia = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const { mediaType, bulktype } = req.params;
    const response = await axios.get(
      `${TMDB_ENDPOINT}/${mediaType}/${bulktype}?api_key=${TMDB_API_KEY}`
    );
    res.status(200).json(response.data.results);
  } catch (error) {
    console.error(error);
    return res.sendStatus(400);
  }
};

export const getMediaDetail = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const { mediaType, mediaid } = req.params;
    const response = await axios.get(
      `${TMDB_ENDPOINT}/${mediaType}/${mediaid}?api_key=${TMDB_API_KEY}`
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

    const movies: any[] = [];
    const tv: any[] = [];
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
      include_adult?: string;
      language?: string;
      page?: string;
      year?: string;
      season?: Season;
    }
  >,
  res: express.Response
) => {
  try {
    const { mediaType } = req.params;
    const { query, include_adult, language, page, year, season } = req.query;

    if (mediaType !== "movie" && mediaType !== "tv") {
      return res.status(400).json({ message: "Invalid media type" });
    }

    const response = await axios.get(`${TMDB_ENDPOINT}/search/${mediaType}`, {
      params: {
        query,
        include_adult,
        language,
        page,
        year,
        api_key: TMDB_API_KEY,
      },
    });

    let filteredResults = response.data.results;

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

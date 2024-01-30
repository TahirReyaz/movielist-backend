import express from "express";
import axios from "axios";

const TMDB_ENDPOINT = "https://api.themoviedb.org/3";

export const getBulkMedia = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const { mediaType, bulktype } = req.params;
    const response = await axios.get(
      `${TMDB_ENDPOINT}/${mediaType}/${bulktype}?api_key=${process.env.TMDB_API_KEY}`
    );
    res.status(200).json(response.data.results);
  } catch (error) {
    console.log(error);
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
      `${TMDB_ENDPOINT}/${mediaType}/${mediaid}?api_key=${process.env.TMDB_API_KEY}`
    );
    try {
      res.status(200).json(response.data);
    } catch (error) {
      console.log(error);
      res.send({ message: "SOMETHING WENT WRONG" });
    }
  } catch (error) {
    console.log(error);
    return res.status(400).send({ message: error });
  }
};

export const searchMulti = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const { query } = req.params;
    const response = await axios.get(
      `${TMDB_ENDPOINT}/search/multi?query=${query}&api_key=${process.env.TMDB_API_KEY}`
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

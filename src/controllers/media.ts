import express from "express";
import axios from "axios";

const TMDB_ENDPOINT = "https://api.themoviedb.org/3";

export const getBulkMedia = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const { media, type } = req.params;
    const response = await axios.get(
      `${TMDB_ENDPOINT}/${media}/${type}?api_key=${process.env.TMDB_API_KEY}`
    );
    try {
      res.status(200).json(response.data.results);
    } catch (error) {
      console.log(error);
      res.send({ message: "SOMETHING WENT WRONG" });
    }
  } catch (error) {
    console.log(error);
    return res.sendStatus(400);
  }
};

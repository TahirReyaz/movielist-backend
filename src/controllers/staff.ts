import express from "express";
import axios from "axios";
import { TMDB_API_KEY, TMDB_ENDPOINT } from "../constants/misc";

export const getStaffDetail = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const { staffid } = req.params;
    const response = await axios.get(
      `${TMDB_ENDPOINT}/person/${staffid}?api_key=${TMDB_API_KEY}`
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

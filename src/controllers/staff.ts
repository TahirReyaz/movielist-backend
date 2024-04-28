import express from "express";
import axios from "axios";
import { TMDB_API_KEY, TMDB_ENDPOINT } from "../constants/misc";
import { divideMediaByMediaType, divideMediaByYear } from "../helpers";

export const getStaffDetail = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const { staffid } = req.params;
    const response = await axios.get(`${TMDB_ENDPOINT}/person/${staffid}`, {
      params: {
        api_key: TMDB_API_KEY,
      },
    });

    res.status(200).json(response.data);
  } catch (error) {
    console.error(error);
    return res.status(400).send({ message: error });
  }
};

export const getStaffCredits = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const { staffid } = req.params;
    const response = await axios.get(
      `${TMDB_ENDPOINT}/person/${staffid}/combined_credits`,
      {
        params: {
          api_key: TMDB_API_KEY,
        },
      }
    );

    const credits = response.data;
    const dividedMedia = divideMediaByYear(credits.cast);

    res.status(200).json(dividedMedia);
  } catch (error) {
    console.error(error);
    return res.status(400).send({ message: error });
  }
};

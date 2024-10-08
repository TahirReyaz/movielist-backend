import express from "express";
import axios from "axios";

import { TMDB_API_KEY, TMDB_ENDPOINT } from "../constants/misc";
import { divideMediaByYear } from "../helpers";

export const getStaffDetail = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const { staffid } = req.params;
    const response = await axios.get(`${TMDB_ENDPOINT}/person/${staffid}`, {
      params: {
        api_key: TMDB_API_KEY,
        append_to_response: "external_ids",
      },
    });

    res.status(200).json(response.data);
  } catch (error) {
    console.error(error);
    return res.status(500).send({ message: error.message });
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

    const cast = response.data?.cast;
    const crew = response.data?.crew;
    let credits: any[] = [];
    if (cast) {
      credits = [...cast];
    }
    if (crew) {
      const crewMap = new Map();
      crew.forEach((media: any) => {
        const mediaid = media.id;
        if (crewMap.has(mediaid)) {
          const oldJob = crewMap.get(mediaid).job;
          const newJob = `${oldJob} & ${media.job}`;
          crewMap.set(mediaid, { ...media, job: newJob });
        } else {
          crewMap.set(mediaid, media);
        }
      });
      const uniqueCrewMedia = Array.from(crewMap, ([mediaid, media]) => media);
      credits = [...credits, ...uniqueCrewMedia];
    }
    const dividedCredits = divideMediaByYear(credits);

    res.status(200).json({ credits: dividedCredits });
  } catch (error) {
    console.error(error);
    return res.status(500).send({ message: error.message });
  }
};

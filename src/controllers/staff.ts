import express from "express";

import { divideMediaByYear } from "../helpers";
import tmdbClient from "../utils/api";

export const getStaffDetail = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const { staffid } = req.params;

    const response = await tmdbClient.get(`/person/${staffid}`, {
      params: {
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
    const response = await tmdbClient.get(
      `/person/${staffid}/combined_credits`
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

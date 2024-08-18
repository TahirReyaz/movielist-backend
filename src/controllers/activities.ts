import express from "express";

import { getActivities } from "../db/activities";

export const getAllActivities = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const activities = await getActivities();

    return res.status(200).json(activities);
  } catch (error) {
    console.error(error);
    return res.status(400).send({ message: "Database error" });
  }
};

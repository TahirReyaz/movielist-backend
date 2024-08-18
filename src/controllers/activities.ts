import express from "express";

import { ActivityModel, getActivities } from "../db/activities";
import { UserModel } from "../db/users";

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

export const getActivitiesByUsername = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const { username } = req.params;
    //  Find the user by username
    const user = await UserModel.findOne({ username });
    if (!user) {
      throw new Error("User not found");
    }

    // Find activities by user ID
    const activities = await ActivityModel.find({ owner: user._id })
      .populate("owner", "username avatar")
      .sort({ createdAt: -1 })
      .exec();

    return res.status(200).json(activities);
  } catch (error) {
    console.error(error);
    return res.status(400).send({ message: "Database error" });
  }
};

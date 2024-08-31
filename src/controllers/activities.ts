import express from "express";
import mongoose from "mongoose";
import lodash from "lodash";

import { getActivities, getActivityById } from "../db/activities";
import { getUserById, getUserByUsername } from "../db/users";
import { getActivitiesCount } from "../helpers/activity";
import { createComment, getComments } from "../db/comments";
import { getCommentsCount } from "../helpers/comments";
import { createNotification } from "db/notifications";
import { DEFAULT_AVATAR_URL } from "constants/misc";

export const getAllActivities = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const startIndex = (page - 1) * limit;

    const totalActivities = await getActivitiesCount();
    const activities = await getActivities({ skip: startIndex, limit });

    // Prepare pagination information
    const pagination = {
      totalItems: totalActivities,
      totalPages: Math.ceil(totalActivities / limit),
      currentPage: page,
      pageSize: limit,
    };

    // Return the activities and pagination info
    return res.status(200).json({ activities, pagination });
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
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const { username } = req.params;

    //  Find the user by username
    const user = await getUserByUsername(username);
    if (!user) {
      throw new Error("User not found");
    }

    const query = { owner: user._id };

    const startIndex = (page - 1) * limit;

    const totalActivities = await getActivitiesCount(query);
    const activities = await getActivities({
      skip: startIndex,
      limit,
      query,
    });

    // Prepare pagination information
    const pagination = {
      totalItems: totalActivities,
      totalPages: Math.ceil(totalActivities / limit),
      currentPage: page,
      pageSize: limit,
    };

    return res.status(200).json({ activities, pagination });
  } catch (error) {
    console.error(error);
    return res.status(400).send({ message: "Database error" });
  }
};

export const getFollowingActivities = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const userid = lodash.get(req, "identity._id") as mongoose.Types.ObjectId;

    const user = await getUserById(userid.toString());

    const followingIds = user.following;
    followingIds.push(userid);
    const query = {
      owner: { $in: followingIds },
    };

    const startIndex = (page - 1) * limit;
    const totalActivities = await getActivitiesCount(query);
    const activities = await getActivities({
      skip: startIndex,
      limit,
      query,
    });
    // Prepare pagination information
    const pagination = {
      totalItems: totalActivities,
      totalPages: Math.ceil(totalActivities / limit),
      currentPage: page,
      pageSize: limit,
    };

    return res.status(200).json({ activities, pagination });
  } catch (error) {
    console.error(error);
    return res.status(400).send({ message: error.message });
  }
};

export const likeActivity = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const { activityId } = req.params;
    const activity = await getActivityById(activityId);
    if (!activity) {
      return res.status(404).send({ message: "Activity not found" });
    }

    const userid = lodash.get(req, "identity._id") as mongoose.Types.ObjectId;
    const foundUser: boolean = activity.likes?.some(
      (likedUserid: mongoose.Types.ObjectId) => likedUserid.equals(userid)
    );

    if (foundUser) {
      return res.status(400).send({ message: "Already liked" });
    } else {
      activity.likes.push(userid);
    }
    await activity.save();

    // Generate Notification
    const user = await getUserById(userid.toString());

    await createNotification({
      type: "activity",
      read: false,
      content: "liked your activity",
      pointingImg: user.avatar ?? DEFAULT_AVATAR_URL,
      pointingId: user.username,
      pointingType: "user",
      owner: activity.owner._id,
    });

    return res.status(200).send({ message: "You like that, huh" });
  } catch (error) {
    console.error(error);
    return res.status(400).send({ message: "Database error" });
  }
};

export const unlikeActivity = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const { activityId } = req.params;
    const activity = await getActivityById(activityId);
    if (!activity) {
      return res.status(404).send({ message: "Activity not found" });
    }

    const userid = lodash.get(req, "identity._id") as mongoose.Types.ObjectId;
    const foundUser = activity.likes?.some(
      (likedUserid: mongoose.Types.ObjectId) => likedUserid.equals(userid)
    );

    if (!foundUser) {
      return res.status(400).send({ message: "Already not liked" });
    } else {
      activity.likes = activity.likes.filter(
        (likedUserid: mongoose.Types.ObjectId) => !likedUserid.equals(userid)
      );
    }
    await activity.save();

    return res.status(200).send({ message: "You like that, huh" });
  } catch (error) {
    console.error(error);
    return res.status(500).send({ message: "Database error" });
  }
};

export const commentOnActivity = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const { activityId } = req.params;
    const { content } = req.body;
    const userid = lodash.get(req, "identity._id") as mongoose.Types.ObjectId;
    const newComment = await createComment({
      activityId,
      content,
      owner: userid,
    });

    res.status(200).json(newComment);
  } catch (error) {
    console.error(error);
    res.status(500).end();
  }
};

export const getActivityComments = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const { activityId } = req.params;

    const query = { activityId };

    const startIndex = (page - 1) * limit;

    const totalComments = await getCommentsCount(query);

    const pagination = {
      totalItems: totalComments,
      totalPages: Math.ceil(totalComments / limit),
      currentPage: page,
      pageSize: limit,
    };

    const comments = await getComments({
      skip: startIndex,
      limit,
      query,
    });

    res.status(200).json({ comments, pagination });
  } catch (error) {
    console.error(error);
    res.status(500).end();
  }
};

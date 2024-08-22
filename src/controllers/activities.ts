import express from "express";
import mongoose from "mongoose";

import {
  ActivityModel,
  getActivities,
  getUserActivities,
} from "../db/activities";
import { UserModel, getUserById } from "../db/users";
import {
  getActivitiesCount,
  getUserActivitiesCount,
} from "../helpers/activity";

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
    const user = await UserModel.findOne({ username });
    if (!user) {
      throw new Error("User not found");
    }

    const startIndex = (page - 1) * limit;

    const totalActivities = await getUserActivitiesCount(user._id.toString());
    const activities = await getUserActivities({
      skip: startIndex,
      limit,
      userid: user._id.toString(),
    });

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

// export const getFollowingActivities = async (
//   req: express.Request,
//   res: express.Response
// ) => {
//   try {
//     const { userid } = req.params;
//     //  Find the following list of the user
//     const user = await getUserById(userid);
//     if (!user) {
//       throw new Error("User not found");
//     }
//     const followingIds = user.following;
//     if (!followingIds || followingIds.length === 0) {
//       return res.status(200).json([]);
//     }
//     followingIds.push(userid);

//     // Convert string userIds to ObjectId if necessary
//     const userObjectIds = followingIds.map(
//       (id) => new mongoose.Types.ObjectId(id)
//     );

//     // Query activities where owner is in the userObjectIds array
//     const activities = await ActivityModel.find({
//       owner: { $in: userObjectIds },
//     })
//       .populate("owner", "username avatar")
//       .sort({ createdAt: -1 })
//       .exec();

//     return res.status(200).json(activities);
//   } catch (error) {
//     console.error(error);
//     return res.status(400).send({ message: error.message });
//   }
// };

import express from "express";
import mongoose from "mongoose";
import lodash from "lodash";

import { createReview, getReviewById } from "../db/reviews";
import { getUserById } from "../db/users";
import { createNotification } from "../db/notifications";
import { DEFAULT_AVATAR_URL } from "../constants/misc";

export const createReviewController = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const {
      content,
      summary,
      mediaid,
      mediaType,
      score,
      title,
      privateReview,
      backdrop,
    } = req.body;

    if (!content || !summary || !mediaid || !mediaType || !score || !title) {
      console.log(req.body);
      return res.status(400).send({ message: "Missing fields" });
    }

    const userid = lodash.get(req, "identity._id") as mongoose.Types.ObjectId;

    const review = await createReview({
      owner: userid.toString(),
      content,
      summary,
      mediaid,
      mediaType,
      score,
      title,
      backdrop,
      private: privateReview ?? false,
    });

    return res.status(200).json(review);
  } catch (error) {
    console.error(error);
    return res.status(500).send({ message: "Error while creating" });
  }
};

export const likeReview = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const { reviewId } = req.params;
    const review = await getReviewById(reviewId);

    if (!review) {
      return res.status(404).send({ message: "Review not found" });
    }

    const userid = lodash.get(req, "identity._id") as mongoose.Types.ObjectId;
    const foundUser: boolean = review.likes?.some(
      (likedUserid: mongoose.Types.ObjectId) => likedUserid.equals(userid)
    );

    if (foundUser) {
      return res.status(400).send({ message: "Already liked" });
    } else {
      review.likes.push(userid);
    }
    await review.save();

    // Generate Notification
    const user = await getUserById(userid.toString());

    if (!userid.equals(review.owner._id)) {
      await createNotification({
        type: "activity",
        read: false,
        content: "liked your activity",
        pointingImg: user.avatar ?? DEFAULT_AVATAR_URL,
        pointingId: user.username,
        pointingType: "user",
        activityId: reviewId,
        owner: review.owner._id,
      });
    }

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
  // try {
  //   const { activityId } = req.params;
  //   const activity = await getActivityById(activityId);
  //   if (!activity) {
  //     return res.status(404).send({ message: "Activity not found" });
  //   }
  //   const userid = lodash.get(req, "identity._id") as mongoose.Types.ObjectId;
  //   const foundUser = activity.likes?.some(
  //     (likedUserid: mongoose.Types.ObjectId) => likedUserid.equals(userid)
  //   );
  //   if (!foundUser) {
  //     return res.status(400).send({ message: "Already not liked" });
  //   } else {
  //     activity.likes = activity.likes.filter(
  //       (likedUserid: mongoose.Types.ObjectId) => !likedUserid.equals(userid)
  //     );
  //   }
  //   await activity.save();
  //   return res.status(200).send({ message: "You like that, huh" });
  // } catch (error) {
  //   console.error(error);
  //   return res.status(500).send({ message: "Database error" });
  // }
};

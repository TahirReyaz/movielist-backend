import mongoose from "mongoose";
import express from "express";
import lodash from "lodash";
import { getCommentById } from "../db/comments";

export const likeComment = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const { commentId } = req.params;
    const comment = await getCommentById(commentId);
    if (!comment) {
      return res.status(404).send({ message: "Comment not found" });
    }

    const userid = lodash.get(req, "identity._id") as mongoose.Types.ObjectId;
    const foundUser: boolean = comment.likes?.some(
      (likedUserid: mongoose.Types.ObjectId) => likedUserid.equals(userid)
    );

    if (foundUser) {
      return res.status(400).send({ message: "Already liked" });
    } else {
      comment.likes.push(userid);
    }
    await comment.save();

    return res.status(200).send({ message: "You like that, huh" });
  } catch (error) {
    console.error(error);
    return res.status(500).send({ message: "Database error" });
  }
};

export const unlikeComment = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const { commentId } = req.params;
    const comment = await getCommentById(commentId);
    if (!comment) {
      return res.status(404).send({ message: "Comment not found" });
    }

    const userid = lodash.get(req, "identity._id") as mongoose.Types.ObjectId;
    const foundUser = comment.likes?.some(
      (likedUserid: mongoose.Types.ObjectId) => likedUserid.equals(userid)
    );

    if (!foundUser) {
      return res.status(400).send({ message: "Already not liked" });
    } else {
      comment.likes = comment.likes.filter(
        (likedUserid: mongoose.Types.ObjectId) => !likedUserid.equals(userid)
      );
    }
    await comment.save();

    return res.status(200).send({ message: "You like that, huh" });
  } catch (error) {
    console.error(error);
    return res.status(500).send({ message: "Database error" });
  }
};

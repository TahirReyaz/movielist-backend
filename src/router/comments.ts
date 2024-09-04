import express from "express";

import { isAuthenticated, paramCommentExists } from "../middlewares";
import {
  deleteComment,
  likeComment,
  unlikeComment,
} from "../controllers/comments";

export default (router: express.Router) => {
  router.patch(
    "/comment/like/:commentId",
    isAuthenticated,
    paramCommentExists,
    likeComment
  );
  router.patch(
    "/comment/unlike/:commentId",
    isAuthenticated,
    paramCommentExists,
    unlikeComment
  );
  router.delete(
    "/comment/:commentId",
    isAuthenticated,
    paramCommentExists,
    deleteComment
  );
};

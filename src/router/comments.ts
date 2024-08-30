import express from "express";

import { isAuthenticated } from "../middlewares";
import { likeComment, unlikeComment } from "../controllers/comments";

export default (router: express.Router) => {
  router.patch("/comment/like/:commentId", isAuthenticated, likeComment);
  router.patch("/comment/unlike/:commentId", isAuthenticated, unlikeComment);
};

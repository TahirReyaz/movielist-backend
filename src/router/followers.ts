import express from "express";
import { isAuthenticated } from "middlewares";

import { followUser, unfollowUser } from "../controllers/followers";

export default (router: express.Router) => {
  router.post("/followers/:username", isAuthenticated, followUser);
  router.delete("/followers/:username", isAuthenticated, unfollowUser);
};

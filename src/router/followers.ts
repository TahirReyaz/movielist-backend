import express from "express";

import { isAuthenticated, isUserExists } from "../middlewares";

import {
  followUser,
  getUserFollowers,
  getUserFollowings,
  unfollowUser,
} from "../controllers/followers";

export default (router: express.Router) => {
  router.get("/followers/:username", isUserExists, getUserFollowers);
  router.get("/followers/following/:username", isUserExists, getUserFollowings);
  router.post("/followers/:username", isAuthenticated, followUser);
  router.delete("/followers/:username", isAuthenticated, unfollowUser);
};

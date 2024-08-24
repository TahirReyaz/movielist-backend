import express from "express";

import {
  deleteUser,
  getAllUsers,
  updateUser,
  getProfile,
  followUser,
  getBulkUsers,
  toggleFav,
  unfollowUser,
} from "../controllers/users";
import { isAuthenticated, isOwner } from "../middlewares";
import { generateAllUserStats } from "../controllers/stats";
import { transformEntries } from "../helpers/stats";

export default (router: express.Router) => {
  router.get("/users", isAuthenticated, getAllUsers);
  router.get("/users/bulk", getBulkUsers);
  router.patch("/users/updatestats", generateAllUserStats);
  router.get("/user/:username", getProfile);
  router.delete("/user", isAuthenticated, deleteUser);
  router.patch("/user/:id", isAuthenticated, isOwner, updateUser);
  router.patch("/user/follow/:username", isAuthenticated, followUser);
  router.delete("/user/unfollow/:username", isAuthenticated, unfollowUser);
  router.patch("/user/:id/fav", isAuthenticated, toggleFav);
  router.patch("/user/:id/transformentries", isAuthenticated, transformEntries);
};

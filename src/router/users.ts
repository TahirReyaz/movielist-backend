import express from "express";

import {
  deleteUser,
  getAllUsers,
  updateUser,
  getProfile,
  followUser,
  toggleFav,
  unfollowUser,
  updateStats,
  flagForDeletion,
  changeUsername,
} from "../controllers/users";
import { isAuthenticated, isOwner, isPasswordCorrect } from "../middlewares";
import { generateAllUserStats } from "../controllers/stats";
import { transformEntries } from "../helpers/stats";

export default (router: express.Router) => {
  router.get("/users", isAuthenticated, getAllUsers);
  router.patch("/users/updatestats", generateAllUserStats);
  router.get("/user/:username", getProfile);
  router.delete("/user", isAuthenticated, isPasswordCorrect, deleteUser);
  router.patch("/user/:id", isAuthenticated, isOwner, updateUser);
  router.patch("/user/update/username", isAuthenticated, changeUsername);
  router.patch("/user/follow/:username", isAuthenticated, followUser);
  router.delete("/user/unfollow/:username", isAuthenticated, unfollowUser);
  router.patch("/user/fav/toggle", isAuthenticated, toggleFav);
  router.patch("/user/stats/update", isAuthenticated, updateStats);
  router.patch("/user/flag/delete", isAuthenticated, flagForDeletion);
  router.patch("/user/:id/transformentries", isAuthenticated, transformEntries);
};

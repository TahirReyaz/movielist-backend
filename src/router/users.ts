import express from "express";

import {
  deleteUser,
  getAllUsers,
  updateUser,
  getProfile,
  followUser,
  getBulkUsers,
  toggleFav,
} from "../controllers/users";
import { isAuthenticated, isOwner } from "../middlewares";

export default (router: express.Router) => {
  router.get("/users", isAuthenticated, getAllUsers);
  router.get("/users/bulk", getBulkUsers);
  router.get("/user/:username", getProfile);
  router.delete("/user/:id", isAuthenticated, isOwner, deleteUser);
  router.patch("/user/:id", isAuthenticated, isOwner, updateUser);
  router.patch("/user/follow/:targetId", isAuthenticated, followUser);
  router.patch("/user/:id/fav", isAuthenticated, toggleFav);
};

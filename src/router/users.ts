import express from "express";

import {
  deleteUser,
  getAllUsers,
  updateUser,
  getProfile,
  followUser,
  getBulkUsers,
} from "../controllers/users.js";
import { isAuthenticated, isOwner } from "../middlewares/index.js";

export default (router: express.Router) => {
  router.get("/users", isAuthenticated, getAllUsers);
  router.get("/users/bulk", getBulkUsers);
  router.get("/user/:username", getProfile);
  router.delete("/user/:id", isAuthenticated, isOwner, deleteUser);
  router.patch("/user/:id", isAuthenticated, isOwner, updateUser);
  router.patch("/user/follow/:targetId", isAuthenticated, followUser);
};

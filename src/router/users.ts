import express from "express";

import {
  deleteUser,
  getAllUsers,
  updateUser,
  getProfile,
  toggleFav,
  flagForDeletion,
  changeUsername,
  getMods,
} from "../controllers/users";
import { isAuthenticated, isOwner, isPasswordCorrect } from "../middlewares";
import { transformEntries } from "../helpers/stats";

export default (router: express.Router) => {
  router.get("/users", isAuthenticated, getAllUsers);
  router.get("/users/mods", getMods);
  router.get("/user/:username", getProfile);
  router.delete("/user", isAuthenticated, isPasswordCorrect, deleteUser);
  router.patch("/user/:id", isAuthenticated, isOwner, updateUser);
  router.patch("/user/update/username", isAuthenticated, changeUsername);
  router.patch("/user/fav/toggle", isAuthenticated, toggleFav);
  router.patch("/user/flag/delete", isAuthenticated, flagForDeletion);
  router.patch("/user/:id/transformentries", isAuthenticated, transformEntries);
};

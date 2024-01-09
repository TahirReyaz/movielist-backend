import express from "express";

import { isAuthenticated, isOwnList, isOwner } from "../middlewares/index.js";
import {
  createListEntry,
  getAllListEntries,
  getEntry,
} from "../controllers/listEntries.js";

export default (router: express.Router) => {
  router.get("/entries", isAuthenticated, getAllListEntries);
  router.get("/entry/:id", getEntry);
  router.post("/entry", isAuthenticated, isOwnList, createListEntry);
  // router.patch("/list/update/:listid", isAuthenticated, isOwnList, updateList);
  // router.patch("/list/additem", isAuthenticated, isOwner, addListItem);
};

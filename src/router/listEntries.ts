import express from "express";

import { isAuthenticated, isOwnEntry } from "../middlewares";
import {
  createListEntry,
  deleteEntry,
  getAllListEntries,
  getEntryController,
  getUserEntriesByMediaId,
  getUserEntriesByMediaType,
  increaseProgress,
  updateListEntry,
} from "../controllers/listEntries";

export default (router: express.Router) => {
  router.get("/entries", isAuthenticated, getAllListEntries);
  router.get("/entries/user/:username/:mediaType", getUserEntriesByMediaType);
  router.get("/entry/:id", getEntryController);
  router.post("/entry", isAuthenticated, createListEntry);
  router.delete("/entry/:entryid", isAuthenticated, isOwnEntry, deleteEntry);
  router.patch("/entry/:entryid", isAuthenticated, isOwnEntry, updateListEntry);
  router.get(
    "/entry/user/media/:mediaid",
    isAuthenticated,
    getUserEntriesByMediaId
  );
  router.patch(
    "/entry/:entryid/increaseprogress",
    isAuthenticated,
    isOwnEntry,
    increaseProgress
  );
};

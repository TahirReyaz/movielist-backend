import express from "express";

import {
  isAuthenticated,
  isEntryCreater,
  isOwnEntry,
  isOwner,
} from "../middlewares";
import {
  createListEntry,
  deleteEntry,
  getAllListEntries,
  getEntryController,
  increaseProgress,
  updateListEntry,
} from "../controllers/listEntries";

export default (router: express.Router) => {
  router.get("/entries", isAuthenticated, getAllListEntries);
  router.get("/entry/:id", getEntryController);
  router.post("/entry", isAuthenticated, isEntryCreater, createListEntry);
  router.delete("/entry/:entryid", isAuthenticated, isOwnEntry, deleteEntry);
  router.patch("/entry/:entryid", isAuthenticated, isOwnEntry, updateListEntry);
  router.patch(
    "/entry/:entryid/increaseprogress",
    isAuthenticated,
    isOwnEntry,
    increaseProgress
  );
};

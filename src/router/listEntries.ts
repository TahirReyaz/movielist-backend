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
  getEntry,
  updateListEntry,
} from "../controllers/listEntries";

export default (router: express.Router) => {
  router.get("/entries", isAuthenticated, getAllListEntries);
  router.get("/entry/:id", getEntry);
  router.post("/entry", isAuthenticated, isEntryCreater, createListEntry);
  router.delete("/entry/:entryid", isAuthenticated, isOwnEntry, deleteEntry);
  router.patch("/entry/:entryid", isAuthenticated, isOwnEntry, updateListEntry);
  // router.patch("/list/update/:listid", isAuthenticated, isOwnList, updateList);
  // router.patch("/list/additem", isAuthenticated, isOwner, addListItem);
};

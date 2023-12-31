import {
  addListItem,
  createList,
  getAllLists,
  getList,
  updateList,
} from "../controllers/lists.js";
import express from "express";
import { isAuthenticated, isOwnList, isOwner } from "../middlewares/index.js";

export default (router: express.Router) => {
  router.get("/lists", isAuthenticated, getAllLists);
  router.get("/list/:id", getList);
  router.post("/list", isAuthenticated, isOwnList, createList);
  router.patch("/list/update/:listid", isAuthenticated, isOwnList, updateList);
  router.patch("/list/additem", isAuthenticated, isOwner, addListItem);
};

import {
  createList,
  getAllLists,
  getList,
  updateList,
} from "../controllers/lists.js";
import express from "express";
import { isAuthenticated, isOwnList } from "../middlewares/index.js";

export default (router: express.Router) => {
  router.get("/lists", isAuthenticated, getAllLists);
  router.get("/list/:id", getList);
  router.post("/list", isAuthenticated, isOwnList, createList);
  router.patch("/list/:listid", isAuthenticated, isOwnList, updateList);
};

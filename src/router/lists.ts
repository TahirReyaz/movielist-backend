import {
  addListItem,
  createList,
  deleteList,
  getAllLists,
  getList,
  updateList,
} from "../controllers/lists";
import express from "express";
import { isAuthenticated, isOwnList, isOwner } from "../middlewares";

export default (router: express.Router) => {
  router.get("/lists", isAuthenticated, getAllLists);
  router.get("/list/:id", getList);
  router.post("/list", isAuthenticated, isOwnList, createList);
  router.delete("/list/:listid", isAuthenticated, isOwnList, deleteList);
  router.patch("/list/update/:listid", isAuthenticated, isOwnList, updateList);
  router.patch("/list/additem", isAuthenticated, isOwner, addListItem);
};

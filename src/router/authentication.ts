import express from "express";

import {
  changePassword,
  login,
  loginUsingToken,
  register,
} from "../controllers/authentication";
import { isAuthenticated } from "../middlewares";

export default (router: express.Router) => {
  router.post("/auth/register", register);
  router.post("/auth/login", login);
  router.post("/auth/sessionlogin", loginUsingToken);
  router.patch("/auth/update/password", isAuthenticated, changePassword);
};

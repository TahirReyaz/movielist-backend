import express from "express";

import {
  login,
  loginUsingToken,
  register,
} from "../controllers/authentication";

export default (router: express.Router) => {
  router.post("/auth/register", register);
  router.post("/auth/login", login);
  router.post("/auth/sessionlogin", loginUsingToken);
};

import express from "express";

import authentication from "./authentication.js";
import users from "./users.js";
import media from "./media.js";
import lists from "./lists.js";

const router = express.Router();

export default (): express.Router => {
  authentication(router);
  users(router);
  media(router);
  lists(router);
  return router;
};

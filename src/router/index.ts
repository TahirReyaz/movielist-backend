import express from "express";

import authentication from "./authentication";
import users from "./users";
import media from "./media";
import entries from "./listEntries";
import staff from "./staff";
import activities from "./activities";
import comments from "./comments";
import notifications from "./notifications";
import stats from "./stats";
import followers from "./followers";

const router = express.Router();

export default (): express.Router => {
  router.get("/", async (req, res) => {
    res.send("HELLO WORLD");
  });
  authentication(router);
  users(router);
  media(router);
  staff(router);
  entries(router);
  activities(router);
  comments(router);
  notifications(router);
  stats(router);
  followers(router);
  return router;
};

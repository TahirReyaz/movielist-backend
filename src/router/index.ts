import express from "express";

import authentication from "./authentication";
import users from "./users";
import media from "./media";
// import lists from "./lists";
import entries from "./listEntries";

const router = express.Router();

export default (): express.Router => {
  router.get("/", async (req, res) => {
    res.send("HELLO WORLD");
  });
  authentication(router);
  users(router);
  media(router);
  // lists(router);
  entries(router);
  return router;
};

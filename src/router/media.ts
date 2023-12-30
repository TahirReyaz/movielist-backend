import express from "express";

import { getBulkMedia } from "../controllers/media.js";

export default (router: express.Router) => {
  router.get("/:media/:type", getBulkMedia);
};

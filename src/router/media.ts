import express from "express";

import { getBulkMedia, getMediaDetail } from "../controllers/media.js";

export default (router: express.Router) => {
  router.get("/:mediatype/bulk/:bulktype", getBulkMedia);
  router.get("/:mediatype/detail/:mediaid", getMediaDetail);
};

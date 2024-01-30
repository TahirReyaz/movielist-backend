import express from "express";

import {
  getBulkMedia,
  getMediaDetail,
  searchMulti,
} from "../controllers/media";

export default (router: express.Router) => {
  router.get("/:mediaType/bulk/:bulktype", getBulkMedia);
  router.get("/:mediaType/detail/:mediaid", getMediaDetail);
  router.get("/search/:query", searchMulti);
};

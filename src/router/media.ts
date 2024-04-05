import express from "express";

import {
  getBulkMedia,
  getMediaCharacters,
  getMediaDetail,
  getMediaRecommendations,
  getMediaTags,
  searchMedia,
  searchMulti,
} from "../controllers/media";

export default (router: express.Router) => {
  router.get("/:mediaType/bulk/:bulktype", getBulkMedia);
  router.get("/:mediaType/detail/:mediaid", getMediaDetail);
  router.get("/:mediaType/tags/:mediaid", getMediaTags);
  router.get("/:mediaType/characters/:mediaid", getMediaCharacters);
  router.get("/:mediaType/recommendations/:mediaid", getMediaRecommendations);
  router.get("/search/multi/:query", searchMulti);
  router.get("/search/:mediaType", searchMedia);
};

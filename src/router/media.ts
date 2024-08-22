import express from "express";

import {
  getBulkMedia,
  getGenreList,
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
  router.get("/:mediaType/credits/:mediaid", getMediaCharacters);
  router.get("/:mediaType/recommendations/:mediaid", getMediaRecommendations);
  router.get("/:mediaType/genre", getGenreList);
  router.get("/search/multi/:query", searchMulti);
  router.get("/search/:mediaType", searchMedia);
};

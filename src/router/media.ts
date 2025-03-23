import express from "express";

import {
  getBulkMedia,
  getFollowingStatusByMediaid,
  getGenreList,
  getMediaCredits,
  getMediaDetail,
  getMediaRecommendations,
  getMediaRelations,
  getMediaTags,
  getMediaVideos,
  getSeasonDetails,
  getStatusDistributionByMediaId,
  searchMedia,
  searchMulti,
} from "../controllers/media";
import { isAuthenticated } from "../middlewares";

export default (router: express.Router) => {
  router.get("/:mediaType/bulk/:bulktype", getBulkMedia);
  router.get("/:mediaType/detail/:mediaid", getMediaDetail);
  router.get("/:mediaType/tags/:mediaid", getMediaTags);
  router.get("/:mediaType/credits/:mediaid/:season", getMediaCredits);
  router.get("/:mediaType/recommendations/:mediaid", getMediaRecommendations);
  router.get("/:mediaType/videos/:mediaid", getMediaVideos);
  router.get("/:mediaType/genre", getGenreList);
  router.get("/media/:mediaid/relations/:collectionId", getMediaRelations);
  router.get("/:mediaType/:mediaid/season/:seasonNumber", getSeasonDetails);
  router.get(
    "/media/:mediaid/statusdistribution",
    getStatusDistributionByMediaId
  );
  router.get(
    "/media/:mediaid/followingstatus",
    isAuthenticated,
    getFollowingStatusByMediaid
  );
  router.get("/search/multi/:query", searchMulti);
  router.get("/search/:mediaType", searchMedia);
};

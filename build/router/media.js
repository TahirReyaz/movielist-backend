import { getBulkMedia, getMediaDetail, searchMulti, } from "../controllers/media.js";
export default (router) => {
    router.get("/:mediatype/bulk/:bulktype", getBulkMedia);
    router.get("/:mediatype/detail/:mediaid", getMediaDetail);
    router.get("/search/:query", searchMulti);
};

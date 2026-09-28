import express from "express";

import { isAuthenticated } from "../middlewares";
import { getUploadSignature } from "../controllers/uploads";

export default (router: express.Router) => {
  router.post("/upload/signature", isAuthenticated, getUploadSignature);
};

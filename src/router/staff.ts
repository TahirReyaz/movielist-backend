import express from "express";

import { getStaffDetail } from "../controllers/staff";

export default (router: express.Router) => {
  router.get("/staff/:staffid", getStaffDetail);
};

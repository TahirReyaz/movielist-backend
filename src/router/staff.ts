import express from "express";

import { getStaffCredits, getStaffDetail } from "../controllers/staff";

export default (router: express.Router) => {
  router.get("/staff/:staffid/credits", getStaffCredits);
  router.get("/staff/:staffid", getStaffDetail);
};

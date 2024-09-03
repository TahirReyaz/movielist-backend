import express from "express";

import { isAuthenticated, isOwnNotif } from "../middlewares";
import {
  getUserNotifsByType,
  markAllUserNotifAsRead,
  markNotifAsRead,
} from "../controllers/notifications";

export default (router: express.Router) => {
  router.get("/notifications/:type", isAuthenticated, getUserNotifsByType);
  router.patch(
    "/notifications/markall",
    isAuthenticated,
    markAllUserNotifAsRead
  );
  router.patch(
    "/notification/:id",
    isAuthenticated,
    isOwnNotif,
    markNotifAsRead
  );
};

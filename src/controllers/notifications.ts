import mongoose from "mongoose";
import express from "express";
import lodash from "lodash";
import {
  NotificationModel,
  getNotificationById,
  getNotifications,
  getNotifsCount,
} from "../db/notifications";
import { notificationTypes } from "../constants/misc";

export const getUserNotifsByType = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const userid = lodash.get(req, "identity._id") as mongoose.Types.ObjectId;
    const { type } = req.params;

    const query: { owner: mongoose.Types.ObjectId; type?: string } = {
      owner: userid,
    };

    if (type !== "all") {
      if (!notificationTypes.includes(type)) {
        return res.status(400).send({ message: "Wrong Notification Type" });
      }
      query.type = type;
    }

    const startIndex = (page - 1) * limit;

    const totalNotifs = await getNotifsCount(query);

    const pagination = {
      totalItems: totalNotifs,
      totalPages: Math.ceil(totalNotifs / limit),
      currentPage: page,
      pageSize: limit,
    };

    const notifs = await getNotifications({
      skip: startIndex,
      limit,
      query,
    });

    res.status(200).json({ notifs, pagination });
  } catch (error) {
    console.error(error);
    res.status(500).end();
  }
};

export const markNotifAsRead = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const { id } = req.params;

    const notif = await getNotificationById(id);

    notif.read = true;
    await notif.save();

    return res.status(200).send({ message: "Marked read" });
  } catch (error) {
    console.error(error);
    return res.status(500).send({ message: "Database error" });
  }
};

export const markAllUserNotifAsRead = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const userid = lodash.get(req, "identity._id") as mongoose.Types.ObjectId;

    await NotificationModel.updateMany({ owner: userid }, { read: true });

    return res.status(200).send({ message: "Marked all as read" });
  } catch (error) {
    console.error(error);
    return res.status(500).send({ message: "Database error" });
  }
};

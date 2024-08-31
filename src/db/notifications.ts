import mongoose from "mongoose";

export const NotificationSchema = new mongoose.Schema(
  {
    type: { type: String, required: true },
    read: { type: String, required: true },
    content: { type: String, required: true },
    pointingImage: { type: String, required: true },
    pointingId: { type: String, required: true },
    pointingType: { type: String, required: true },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export type Notification = mongoose.InferSchemaType<typeof NotificationSchema>;

export const NotificationModel = mongoose.model(
  "Notification",
  NotificationSchema
);

export const getNotifications = ({
  skip,
  limit,
  query,
}: {
  skip: number;
  limit: number;
  query?: any;
}) =>
  NotificationModel.find(query ?? {})
    .skip(skip || 0)
    .limit(limit || 10)
    .sort({ createdAt: -1 })
    .populate("owner", "username avatar");

export const getNotificationById = (id: string) =>
  NotificationModel.findById(id);

export const createNotification = (values: Record<string, any>) =>
  new NotificationModel(values)
    .save()
    .then((notification) => notification.toObject());

export const deleteNotificationById = (id: string) =>
  NotificationModel.findOneAndDelete({ _id: id });

export const getNotifsCount = async (query?: any) => {
  return NotificationModel.countDocuments(query ?? {}).exec();
};

export const updateNotificationById = (
  id: string,
  values: Record<string, any>
) => NotificationModel.findByIdAndUpdate(id, values);

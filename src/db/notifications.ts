import mongoose from "mongoose";

export const NotificationSchema = new mongoose.Schema(
  {
    type: String,
    read: Boolean,
    content: String,
    image: String,
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
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

export const getNotifications = () => NotificationModel.find();
export const getNotificationById = (id: string) =>
  NotificationModel.findById(id);
export const createNotification = (values: Record<string, any>) =>
  new NotificationModel(values).save().then((activity) => activity.toObject());
export const deleteNotificationById = (id: string) =>
  NotificationModel.findOneAndDelete({ _id: id });
export const updateNotificationById = (
  id: string,
  values: Record<string, any>
) => NotificationModel.findByIdAndUpdate(id, values);

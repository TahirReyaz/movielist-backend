import mongoose from "mongoose";
import { CommentModel } from "./comments";
import { NotificationModel } from "./notifications";

export const ActivitySchema = new mongoose.Schema(
  {
    image: { type: String, required: false },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    action: { type: String, required: false },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    mediaid: { type: Number, required: false },
    mediaType: { type: String, required: false },
    title: { type: String, required: false },
    content: { type: String, required: false },
    type: { type: String, required: true },
  },
  {
    timestamps: true,
  }
);

// Cascade delete
ActivitySchema.pre(
  "deleteMany",
  { document: false, query: true },
  async function (next) {
    const filter = this.getFilter();
    const activities = await ActivityModel.find(filter);
    const activityIds = activities.map((activity) => activity._id);

    // Delete associated comments and notifications
    await CommentModel.deleteMany({ activityId: { $in: activityIds } });
    await NotificationModel.deleteMany({ activityId: { $in: activityIds } });

    next();
  }
);

export type Activity = mongoose.InferSchemaType<typeof ActivitySchema>;

export const ActivityModel = mongoose.model("Activity", ActivitySchema);

export const getActivities = async ({
  skip,
  limit,
  query,
}: {
  skip: number;
  limit: number;
  query?: any;
}) => {
  const activities = await ActivityModel.aggregate([
    { $match: query ?? {} },
    {
      $lookup: {
        from: "comments",
        localField: "_id",
        foreignField: "activityId",
        as: "comments",
      },
    },
    {
      $addFields: {
        commentCount: { $size: "$comments" },
      },
    },
    { $project: { comments: 0 } },
    { $sort: { createdAt: -1 } },
    { $skip: skip || 0 },
    { $limit: limit || 10 },
  ]).exec();

  const populatedActivities = await ActivityModel.populate(activities, [
    { path: "owner", select: "username avatar" },
    { path: "likes", select: "username avatar" },
  ]);

  return populatedActivities;
};

export const getPlainUserActivities = async (userid: string) =>
  ActivityModel.find({ owner: userid }).sort({ createdAt: -1 });

export const getActivityById = (id: string) =>
  ActivityModel.findById(id).populate("owner", "username avatar");
export const createActivity = (values: Record<string, any>) =>
  new ActivityModel(values).save().then((activity) => activity.toObject());
export const deleteActivityById = (id: string) =>
  ActivityModel.deleteMany({ _id: id });
export const updateActivityById = (id: string, values: Record<string, any>) =>
  ActivityModel.findByIdAndUpdate(id, values);

import mongoose from "mongoose";

export const ActivitySchema = new mongoose.Schema(
  {
    image: { type: String, required: true },
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

export const getActivityById = (id: string) =>
  ActivityModel.findById(id).populate("owner", "username avatar");
export const createActivity = (values: Record<string, any>) =>
  new ActivityModel(values).save().then((activity) => activity.toObject());
export const deleteActivityById = (id: string) =>
  ActivityModel.findOneAndDelete({ _id: id });
export const updateActivityById = (id: string, values: Record<string, any>) =>
  ActivityModel.findByIdAndUpdate(id, values);

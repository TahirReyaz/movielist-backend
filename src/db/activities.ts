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

export const getActivities = ({
  skip,
  limit,
}: {
  skip: number;
  limit: number;
}) =>
  ActivityModel.find()
    .skip(skip || 0)
    .limit(limit || 10)
    .populate("owner", "username avatar")
    .sort({ createdAt: -1 });

export const getUserActivities = ({
  userid,
  skip,
  limit,
}: {
  userid: string;
  skip: number;
  limit: number;
}) =>
  ActivityModel.find({ owner: userid })
    .skip(skip || 0)
    .limit(limit || 10)
    .populate("owner", "username avatar")
    .sort({ createdAt: -1 });
export const getActivityById = (id: string) => ActivityModel.findById(id);
export const createActivity = (values: Record<string, any>) =>
  new ActivityModel(values).save().then((activity) => activity.toObject());
export const deleteActivityById = (id: string) =>
  ActivityModel.findOneAndDelete({ _id: id });
export const updateActivityById = (id: string, values: Record<string, any>) =>
  ActivityModel.findByIdAndUpdate(id, values);

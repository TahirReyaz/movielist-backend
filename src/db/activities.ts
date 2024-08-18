import mongoose from "mongoose";

export const ActivitySchema = new mongoose.Schema(
  {
    image: { type: String, required: true },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    action: { type: String, required: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    mediaid: { type: Number, required: true },
    mediaType: { type: String, required: true },
    title: { type: String, required: true },
  },
  {
    timestamps: true,
  }
);

export type Activity = mongoose.InferSchemaType<typeof ActivitySchema>;

export const ActivityModel = mongoose.model("Activity", ActivitySchema);

export const getActivities = () =>
  ActivityModel.find().populate("owner", "username avatar");
export const getActivityById = (id: string) => ActivityModel.findById(id);
export const createActivity = (values: Record<string, any>) =>
  new ActivityModel(values).save().then((activity) => activity.toObject());
export const deleteActivityById = (id: string) =>
  ActivityModel.findOneAndDelete({ _id: id });
export const updateActivityById = (id: string, values: Record<string, any>) =>
  ActivityModel.findByIdAndUpdate(id, values);
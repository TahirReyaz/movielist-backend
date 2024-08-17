import mongoose from "mongoose";

export const ActivitySchema = new mongoose.Schema({
  image: String,
  time: String,
  likes: [String],
  content: String,
  owner: String,
});

export type Activity = mongoose.InferSchemaType<typeof ActivitySchema>;

export const ActivityModel = mongoose.model("Activity", ActivitySchema);

export const getActivities = () => ActivityModel.find();
export const getActivityById = (id: string) => ActivityModel.findById(id);
export const createActivity = (values: Record<string, any>) =>
  new ActivityModel(values).save().then((activity) => activity.toObject());
export const deleteActivityById = (id: string) =>
  ActivityModel.findOneAndDelete({ _id: id });
export const updateActivityById = (id: string, values: Record<string, any>) =>
  ActivityModel.findByIdAndUpdate(id, values);

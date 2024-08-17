import mongoose from "mongoose";

export const CommentSchema = new mongoose.Schema({
  time: String,
  likes: [String],
  content: String,
  owner: String,
  activityId: String,
});

export type Comment = mongoose.InferSchemaType<typeof CommentSchema>;

export const CommentModel = mongoose.model("Comment", CommentSchema);

export const getComments = () => CommentModel.find();
export const getCommentById = (id: string) => CommentModel.findById(id);
export const createComment = (values: Record<string, any>) =>
  new CommentModel(values).save().then((activity) => activity.toObject());
export const deleteCommentById = (id: string) =>
  CommentModel.findOneAndDelete({ _id: id });
export const updateCommentById = (id: string, values: Record<string, any>) =>
  CommentModel.findByIdAndUpdate(id, values);

import mongoose from "mongoose";

export const CommentSchema = new mongoose.Schema(
  {
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    content: { type: String, required: true },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    activityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Activity",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export type Comment = mongoose.InferSchemaType<typeof CommentSchema>;

export const CommentModel = mongoose.model("Comment", CommentSchema);

export const getComments = ({
  skip,
  limit,
  query,
}: {
  skip: number;
  limit: number;
  query?: any;
}) =>
  CommentModel.find(query ?? {})
    .skip(skip || 0)
    .limit(limit || 10)
    .sort({ createdAt: -1 })
    .populate("owner", "username avatar")
    .populate("likes", "username avatar");
export const getCommentById = (id: string) => CommentModel.findById(id);
export const createComment = (values: Record<string, any>) =>
  new CommentModel(values).save().then((activity) => activity.toObject());
export const deleteCommentById = (id: string) =>
  CommentModel.findOneAndDelete({ _id: id });
export const updateCommentById = (id: string, values: Record<string, any>) =>
  CommentModel.findByIdAndUpdate(id, values);

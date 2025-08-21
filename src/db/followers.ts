import mongoose from "mongoose";

export const FollowerSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    target: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export const FollowerModel = mongoose.model("Follower", FollowerSchema);

export type Follower = mongoose.InferSchemaType<typeof FollowerSchema>;

export const getFollowers = (query?: any) =>
  FollowerModel.find(query ?? {})
    .sort({ createdAt: -1 })
    .populate("user", "username avatar")
    .populate("target", "username avatar");

export const getFollower = (query?: any) =>
  FollowerModel.findOne(query ?? {})
    .populate("user", "username avatar")
    .populate("target", "username avatar");

export const createNewFollower = (user: string, target: string) =>
  new FollowerModel({ user, target }).save().then((list) => list.toObject());

export const deleteFollowerById = (id: string) =>
  FollowerModel.findOneAndDelete({ _id: id });

export const removeFollower = (
  user: mongoose.Types.ObjectId,
  target: mongoose.Types.ObjectId
) => FollowerModel.findOneAndDelete({ user, target });

export const deleteFollowersByUserid = (id: mongoose.Types.ObjectId) =>
  FollowerModel.deleteMany({ user: id });

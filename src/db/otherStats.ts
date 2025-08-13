import mongoose from "mongoose";

import { mediaTypeEnum, statTypeEnum } from "../constants/misc";

export const OtherStatSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    mediaType: { type: String, enum: mediaTypeEnum, required: true },
    type: {
      type: String,
      enum: statTypeEnum,
      required: true,
    },
    count: Number,
    meanScore: Number,
    timeWatched: Number,
    statTypeId: { type: String, required: true },
    title: { type: String, required: true },
    profilePath: String,
    list: [{ id: String, posterPath: String, title: String }],
  },
  { timestamps: true }
);

export const OtherStatModel = mongoose.model("OtherStat", OtherStatSchema);

export const createOtherStats = (values: Record<string, any>) =>
  new OtherStatModel(values).save().then((stats) => stats.toObject());

export const deleteOtherStatsByUserid = (userid: string) =>
  OtherStatModel.deleteMany({ user: userid });

export const getOtherStatsFromDB = (
  userid: string,
  mediaType: (typeof mediaTypeEnum)[number],
  statType: (typeof statTypeEnum)[number]
) => OtherStatModel.find({ user: userid, mediaType, type: statType });

export type TOtherStat = mongoose.InferSchemaType<typeof OtherStatSchema>;

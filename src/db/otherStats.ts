import mongoose from "mongoose";

import { mediaTypeEnum, statTypeEnum } from "../constants/misc";
import { MediaType } from "../Interfaces/media";
import { OtherStat, OtherStatType } from "../Interfaces/stats";

/** Mirrors `OtherStat` in Interfaces/stats.ts */
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
    list: [
      {
        _id: false,
        id: String,
        posterPath: String,
        title: String,
        mediaType: { type: String, enum: mediaTypeEnum },
      },
    ],
  },
  { timestamps: true }
);

OtherStatSchema.index({ user: 1, mediaType: 1, type: 1 });

export const OtherStatModel = mongoose.model("OtherStat", OtherStatSchema);

export const createOtherStats = (values: Record<string, any>) =>
  new OtherStatModel(values).save().then((stats) => stats.toObject());

/** Bulk insert – one round trip instead of one per row. */
export const insertOtherStats = (userid: string, stats: OtherStat[]) =>
  stats.length
    ? OtherStatModel.insertMany(stats.map((s) => ({ ...s, user: userid })))
    : Promise.resolve([]);

export const deleteOtherStatsByUserid = (userid: string) =>
  OtherStatModel.deleteMany({ user: userid });

export const getOtherStatsFromDB = (
  userid: string,
  mediaType: MediaType,
  statType: OtherStatType
) =>
  OtherStatModel.find({ user: userid, mediaType, type: statType }).sort({
    count: -1,
  });

export type TOtherStat = mongoose.InferSchemaType<typeof OtherStatSchema>;

import mongoose from "mongoose";

import { mediaTypeEnum } from "../constants/misc";
import { MediaType } from "../Interfaces/media";
import { OverviewStats } from "../Interfaces/stats";

const NumberDistributionSchema = new mongoose.Schema({
  num: Number,
  count: Number,
  hoursWatched: Number,
  meanScore: Number,
});

const DistributionSchema = new mongoose.Schema({
  format: String,
  count: Number,
  hoursWatched: Number,
  meanScore: Number,
});

/** Mirrors `OverviewStats` in Interfaces/stats.ts */
export const OverviewStatSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    mediaType: { type: String, enum: mediaTypeEnum, required: true },
    episodesWatched: { type: Number, default: 0 },
    count: { type: Number, default: 0 },
    daysWatched: { type: Number, default: 0 },
    daysPlanned: { type: Number, default: 0 },
    meanScore: { type: Number, default: 0 },
    standardDeviation: { type: Number, default: 0 },

    score: [NumberDistributionSchema],
    epsCount: [NumberDistributionSchema],
    formatDist: [DistributionSchema],
    statusDist: [DistributionSchema],
    countryDist: [DistributionSchema],
    releaseYear: [DistributionSchema],
    watchYear: [DistributionSchema],
  },
  { timestamps: true }
);

export type { Distribution } from "../Interfaces/stats";

export const OverviewStatModel = mongoose.model(
  "OverviewStat",
  OverviewStatSchema
);

export const createOverviewStats = (values: OverviewStats & { user: string }) =>
  new OverviewStatModel(values).save().then((stats) => stats.toObject());

/** Replace the stored overview for one user + media type. */
export const replaceOverviewStats = (userid: string, stats: OverviewStats) =>
  OverviewStatModel.findOneAndReplace(
    { user: userid, mediaType: stats.mediaType },
    { ...stats, user: userid },
    { upsert: true }
  );

export const updateOverviewStats = (id: string, values: Record<string, any>) =>
  OverviewStatModel.findOneAndUpdate({ _id: id }, values);

export const getOverviewStatsByUseridAndMediaType = (
  userid: string,
  mediaType: MediaType
) => OverviewStatModel.findOne({ user: userid, mediaType });

export const deleteOverviewStatsByUseridAndMediaType = (
  userid: string,
  mediaType: MediaType
) => OverviewStatModel.findOneAndDelete({ user: userid, mediaType });

import mongoose from "mongoose";

import { mediaTypeEnum } from "../constants/misc";

const ScoreSchema = new mongoose.Schema({
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

export const OverviewStatSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    mediaType: { type: String, enum: mediaTypeEnum, required: true },
    episodesWatched: String,
    count: Number,
    daysWatched: { type: Number, default: 0 },
    daysPlanned: { type: Number, default: 0 },
    meanScore: Number,

    score: [ScoreSchema],
    epsCount: [ScoreSchema],
    formatDist: [DistributionSchema],
    statusDist: [DistributionSchema],
    countryDist: [DistributionSchema],
    releaseYear: [DistributionSchema],
    watchYear: [DistributionSchema],
  },
  { timestamps: true }
);

export type Distribution = mongoose.InferSchemaType<typeof DistributionSchema>;

export const OverviewStatModel = mongoose.model(
  "OverviewStat",
  OverviewStatSchema
);

export const createOverviewStats = (values: Record<string, any>) =>
  new OverviewStatModel(values).save().then((stats) => stats.toObject());

export const updateOverviewStats = (id: string, values: Record<string, any>) =>
  OverviewStatModel.findOneAndUpdate({ _id: id }, values);

export const getOverviewStatsByUseridAndMediaType = (
  userid: string,
  mediaType: "movie" | "tv"
) => OverviewStatModel.findOne({ user: userid, mediaType });

export const deleteOverviewStatsByUseridAndMediaType = (
  userid: string,
  mediaType: "movie" | "tv"
) => OverviewStatModel.findOneAndDelete({ user: userid, mediaType });

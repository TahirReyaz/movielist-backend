import mongoose from "mongoose";

import { mediaTypeEnum } from "constants/misc";

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

export const OtherStatSchema = new mongoose.Schema(
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

export const OtherStatModel = mongoose.model("OtherStat", OtherStatSchema);

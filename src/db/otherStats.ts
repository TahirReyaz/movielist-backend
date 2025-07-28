import mongoose from "mongoose";

import { mediaTypeEnum } from "constants/misc";

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
      enum: ["genre", "tag", "studio", "cast", "crew"],
      required: true,
    },
    count: Number,
    meanScore: Number,
    timeWatched: Number,
    statTypeId: { type: Number, required: true },
    title: String,
    profilePath: String,
    list: [{ id: String, posterPath: String, title: String }],
  },
  { timestamps: true }
);

export const OtherStatModel = mongoose.model("OtherStat", OtherStatSchema);

export type TOtherStat = mongoose.InferSchemaType<typeof OtherStatSchema>;

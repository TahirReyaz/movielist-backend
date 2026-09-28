import mongoose from "mongoose";

import { DEFAULT_ENTRY_BANNER_URL } from "../constants/misc";

export const ItemSchema = new mongoose.Schema({
  id: String,
  name: String,
});

export const DataStaffSchema = new mongoose.Schema({
  id: String,
  name: String,
  profile_path: String,
  character: String,
  job: String,
});

const CountrySchema = new mongoose.Schema(
  { iso_3166_1: String, name: String },
  { _id: false }
);

/**
 * Mirrors the `EntryData` type in Interfaces/media.ts.
 * Old documents may be missing the newer fields – the stats engine handles that.
 */
export const EntryDataSchema = new mongoose.Schema(
  {
    kind: { type: String, enum: ["movie", "season"] },
    show_id: String,
    season_number: Number,
    adult: Boolean,
    status: String,
    release_date: String,
    number_of_episodes: { type: Number, default: 1 },
    runtime: Number,
    episode_runtimes: [Number],
    total_runtime: Number,
    vote_average: Number,
    origin_country: [String],
    production_countries: [CountrySchema],
    original_language: String,
    genres: [ItemSchema],
    production_companies: [ItemSchema],
    tags: [ItemSchema],
    cast: [DataStaffSchema],
    crew: [DataStaffSchema],
  },
  { timestamps: true }
);

export const ListEntrySchema = new mongoose.Schema(
  {
    mediaid: { type: String, required: true },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: { type: String, required: true },
    mediaType: { type: String, required: true },
    startDate: String,
    endDate: String,
    progress: { type: Number, default: 0 },
    rewatches: { type: Number, default: 0 },
    score: Number,
    notes: String,
    title: { type: String, required: true },
    poster: String,
    backdrop: {
      type: String,
      required: true,
      default: DEFAULT_ENTRY_BANNER_URL,
    },
    data: EntryDataSchema,
    /** ENTRY_DATA_VERSION the data was built with. Missing = legacy. */
    dataVersion: Number,
    /** Last successful TMDB refresh of `data`. */
    dataUpdatedAt: Date,
    /** Last failed TMDB refresh (so the job doesn't retry it every run). */
    dataFailedAt: Date,
  },
  {
    timestamps: true,
  }
);

ListEntrySchema.index({ owner: 1, mediaid: 1 });
ListEntrySchema.index({ mediaType: 1, mediaid: 1 });
ListEntrySchema.index({ dataUpdatedAt: 1 });

export const ListEntryModel = mongoose.model("ListEntry", ListEntrySchema);

export type ListEntry = mongoose.InferSchemaType<typeof ListEntrySchema>;

export const getEntryById = (id: string) => ListEntryModel.findById(id);

export const getEntries = (query?: any) =>
  ListEntryModel.find(query ?? {})
    .sort({ createdAt: -1 })
    .populate("owner", "username avatar");

export const getEntry = (query?: any) =>
  ListEntryModel.findOne(query ?? {}).populate("owner", "username avatar");

export const createNewEntry = (values: Record<string, any>) =>
  new ListEntryModel(values).save().then((list) => list.toObject());
export const deleteEntryById = (id: string) =>
  ListEntryModel.findOneAndDelete({ _id: id });

export const deleteEntriesByUserid = (id: mongoose.Types.ObjectId) =>
  ListEntryModel.deleteMany({ owner: id });

export const updateEntryById = (id: string, values: Record<string, any>) =>
  ListEntryModel.findByIdAndUpdate(id, values);

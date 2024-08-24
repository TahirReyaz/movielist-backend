import mongoose from "mongoose";

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
    fav: Boolean,
    progress: Number,
    rewatches: Number,
    score: Number,
    notes: String,
    title: { type: String, required: true },
    poster: String,
    backdrop: String,
    data: mongoose.Schema.Types.Mixed,
  },
  {
    timestamps: true,
  }
);

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

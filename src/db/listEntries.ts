import mongoose from "mongoose";

export const ListEntrySchema = new mongoose.Schema(
  {
    mediaid: { type: String, required: true },
    userid: { type: String, required: true },
    status: { type: String, required: true },
    mediaType: { type: String, required: true },
    startDate: String,
    endDate: String,
    fav: Boolean,
    progress: Number,
    rewatches: Number,
    score: Number,
    notes: String,
    title: String,
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

export const getEntries = () => ListEntryModel.find();
export const getEntryBySessionToken = (sessionToken: string) =>
  ListEntryModel.findOne({
    "authentication.sessionToken": sessionToken,
  });
export const getEntryById = (id: string) => ListEntryModel.findById(id);
export const getEntriesByUserId = (userid: string) =>
  ListEntryModel.find({ userid: userid });
export const createNewEntry = (values: Record<string, any>) =>
  new ListEntryModel(values).save().then((list) => list.toObject());
export const deleteEntryById = (id: string) =>
  ListEntryModel.findOneAndDelete({ _id: id });
export const updateEntryById = (id: string, values: Record<string, any>) =>
  ListEntryModel.findByIdAndUpdate(id, values);

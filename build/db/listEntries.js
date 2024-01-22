import mongoose from "mongoose";
const ListEntrySchema = new mongoose.Schema({
    mediaid: { type: String, required: true },
    userid: { type: String, required: true },
    listid: { type: String, required: true },
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
});
export const ListEntryModel = mongoose.model("ListEntry", ListEntrySchema);
export const getEntries = () => ListEntryModel.find();
export const getEntryBySessionToken = (sessionToken) => ListEntryModel.findOne({
    "authentication.sessionToken": sessionToken,
});
export const getEntryById = (id) => ListEntryModel.findById(id);
export const getEntriesByUserId = (userid) => ListEntryModel.find({ userid: userid });
export const createNewEntry = (values) => new ListEntryModel(values).save().then((list) => list.toObject());
export const deleteEntryById = (id) => ListEntryModel.findOneAndDelete({ _id: id });
export const updateEntryById = (id, values) => ListEntryModel.findByIdAndUpdate(id, values);

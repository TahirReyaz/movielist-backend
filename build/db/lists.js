import mongoose from "mongoose";
const ListSchema = new mongoose.Schema({
    type: { type: String, required: true },
    items: { type: [String], required: true },
    userid: { type: String, required: true },
    mediatype: { type: String, required: true },
});
export const ListModel = mongoose.model("List", ListSchema);
export const getLists = () => ListModel.find();
export const getListBySessionToken = (sessionToken) => ListModel.findOne({
    "authentication.sessionToken": sessionToken,
});
export const getListById = (id) => ListModel.findById(id);
export const createNewList = (values) => new ListModel(values).save().then((list) => list.toObject());
export const deleteListById = (id) => ListModel.findOneAndDelete({ _id: id });
export const updateListById = (id, values) => ListModel.findByIdAndUpdate(id, values);

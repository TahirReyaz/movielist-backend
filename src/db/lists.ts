import mongoose from "mongoose";

const ListSchema = new mongoose.Schema({
  type: { type: String, required: true },
  items: { type: [String], required: true },
  userid: { type: String, required: true },
  mediaType: { type: String, required: true },
});

export const ListModel = mongoose.model("List", ListSchema);

export type List = mongoose.InferSchemaType<typeof ListSchema>;

export const getLists = () => ListModel.find();
export const getListBySessionToken = (sessionToken: string) =>
  ListModel.findOne({
    "authentication.sessionToken": sessionToken,
  });
export const getListById = (id: string) => ListModel.findById(id);
export const createNewList = (values: Record<string, any>) =>
  new ListModel(values).save().then((list) => list.toObject());
export const deleteListById = (id: string) =>
  ListModel.findOneAndDelete({ _id: id });
export const updateListById = (id: string, values: Record<string, any>) =>
  ListModel.findByIdAndUpdate(id, values);

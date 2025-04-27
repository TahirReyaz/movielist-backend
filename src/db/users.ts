import mongoose from "mongoose";

import { ActivityModel } from "./activities";
import { ListEntryModel } from "./listEntries";
import { CommentModel } from "./comments";
import { NotificationModel } from "./notifications";

const AuthSchema = new mongoose.Schema({
  password: { type: String, required: true, select: false },
  salt: { type: String, select: false },
  sessionToken: { type: String, select: false },
  verificationCode: { type: Number, select: false },
});

const GenreOverviewSchema = new mongoose.Schema({
  name: String,
  numOfEntries: Number,
});

const PrefSchema = new mongoose.Schema({
  adult: { type: Boolean, required: true, default: false },
  profileColor: { type: String, required: false },
  siteThem: { type: String, required: false },
  restrictMessages: { type: Boolean, required: true, default: false },
  privacy: { type: Number, required: true, default: 0 },
  loginLocation: { type: Boolean, required: true, default: true },
  activityMergeTime: { type: Number, required: true, default: 3600 },
  airingNotifs: { type: Boolean, required: true, default: true },
  defaultListOrder: { type: String, required: true, default: "title" },
  listActivityCreation: {
    watching: { type: Boolean, required: true, default: true },
    planning: { type: Boolean, required: true, default: true },
    completed: { type: Boolean, required: true, default: true },
    paused: { type: Boolean, required: true, default: true },
    dropped: { type: Boolean, required: true, default: true },
    rewatching: { type: Boolean, required: true, default: true },
  },
});

export const UserSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    verified: { type: Boolean, required: true, default: false },
    authentication: AuthSchema,
    authorisation: { type: Number, required: true, default: 0 },
    roles: [
      {
        role: String,
        lead: { type: Boolean, required: true, default: false },
        retired: { type: Boolean, required: true, default: false },
      },
    ],
    about: String,
    fav: {
      movie: [String],
      tv: [String],
      characters: [String],
      staff: [String],
      prod_companies: [String],
    },
    avatar: String,
    banner: String,
    genreOverview: [GenreOverviewSchema],
    preferences: { type: PrefSchema, required: true, default: {} },
  },
  {
    timestamps: true,
  }
);

export type User = mongoose.InferSchemaType<typeof UserSchema>;

// Cascade delete
UserSchema.pre(
  "deleteMany",
  { document: false, query: true },
  async function (next) {
    const filter = this.getFilter();
    const userid = filter._id;

    if (userid) {
      await ActivityModel.deleteMany({ owner: userid });
      await ListEntryModel.deleteMany({ owner: userid });
      await CommentModel.deleteMany({ owner: userid });
      await NotificationModel.deleteMany({ owner: userid });
    }

    next();
  }
);

export const UserModel = mongoose.model("User", UserSchema);

export const getUsers = () => UserModel.find();

export const getUserByEmail = (email: string) => UserModel.findOne({ email });

export const getUserBySessionToken = (sessionToken: string) =>
  UserModel.findOne({
    "authentication.sessionToken": sessionToken,
  });

export const getUserById = (id: string) => UserModel.findById(id);

export const getUserByUsername = (username: string) =>
  UserModel.findOne({ username });

export const searchUsers = (query: string) =>
  UserModel.find({ username: { $regex: query, $options: "i" } });

export const createUser = (values: Record<string, any>) =>
  new UserModel(values).save().then((user) => user.toObject());

export const deleteUserById = (id: mongoose.Types.ObjectId) =>
  UserModel.deleteMany({ _id: id });

export const updateUserById = (id: string, values: Record<string, any>) =>
  UserModel.findByIdAndUpdate(id, values);

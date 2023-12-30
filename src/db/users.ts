import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true },
  email: { type: String, required: true },
  authentication: {
    password: { type: String, required: true, select: false }, //Select fetches the whole auth object containing all users, we don't want that
    salt: { type: String, select: false },
    sessionToken: { type: String, select: false },
  },
  bio: String,
  totalMovies: Number,
  daysWatched: Number,
  meanMovieScore: Number,
  totalShows: Number,
  episodesWatched: Number,
  meanShowScore: Number,
  favMovies: [String],
  favShows: [String],
  favCharacters: [String],
  favStaff: [String],
  dp: String,
  bannerImg: String,
  genreOverview: [
    {
      name: String,
      numOfEntries: Number,
    },
  ],
  lists: [{ listtype: String, id: String }],
});

export type User = mongoose.InferSchemaType<typeof UserSchema>;

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
export const createUser = (values: Record<string, any>) =>
  new UserModel(values).save().then((user) => user.toObject());
export const deleteUserById = (id: string) =>
  UserModel.findOneAndDelete({ _id: id });
export const updateUserById = (id: string, values: Record<string, any>) =>
  UserModel.findByIdAndUpdate(id, values);

import mongoose from "mongoose";

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

const OverviewSchema = new mongoose.Schema({
  totalMovies: Number,
  totalShows: Number,
  episodesWatched: Number,
  daysWatched: Number,
  daysPlanned: Number,
  daysWatchedMovie: Number,
  daysPlannedMovie: Number,
  daysWatchedTv: Number,
  daysPlannedTv: Number,
  meanScore: Number,
  score: [ScoreSchema],
  epsCount: [ScoreSchema],
  formatDist: [DistributionSchema],
  statusDist: [DistributionSchema],
  countryDist: [DistributionSchema],
  releaseYear: [DistributionSchema],
  watchYear: [DistributionSchema],
});

const AuthSchema = new mongoose.Schema({
  password: { type: String, required: true, select: false },
  salt: { type: String, select: false },
  sessionToken: { type: String, select: false },
});

const GenreOverviewSchema = new mongoose.Schema({
  name: String,
  numOfEntries: Number,
});

const EntrySchema = new mongoose.Schema({
  id: String,
  mediaType: String,
  status: String,
  mediaid: String,
});

const StatEntrySchema = new mongoose.Schema({
  title: String,
  posterPath: String,
  id: Number,
  mediaType: String,
});

const StatRankingItemSchema = new mongoose.Schema({
  title: String,
  statTypeId: Number,
  count: Number,
  meanScore: Number,
  timeWatched: Number,
  list: [StatEntrySchema],
});

const ActorItemSchema = new mongoose.Schema({
  title: String,
  actorId: Number,
  profilePath: String,
  count: Number,
  meanScore: Number,
  timeWatched: Number,
  list: [StatEntrySchema],
});

export const UserSchema = new mongoose.Schema(
  {
    username: { type: String, required: true },
    email: { type: String, required: true },
    authentication: AuthSchema,
    about: String,
    totalMovies: Number,
    daysWatched: Number,
    meanMovieScore: Number,
    totalShows: Number,
    episodesWatched: Number,
    meanShowScore: Number,
    fav: {
      movie: [String],
      tv: [String],
      characters: [String],
      staff: [String],
      prod_companies: [String],
    },
    avatar: String,
    bannerImg: String,
    genreOverview: [GenreOverviewSchema],
    entries: [EntrySchema],
    followers: [String],
    following: [String],
    stats: {
      overview: OverviewSchema,
      genres: [StatRankingItemSchema],
      tags: [StatRankingItemSchema],
      actors: [ActorItemSchema],
      studios: [StatRankingItemSchema],
      staff: mongoose.Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  }
);

export type User = mongoose.InferSchemaType<typeof UserSchema>;
export type UserEntries = User["entries"][number];

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
export const deleteUserById = (id: string) =>
  UserModel.findOneAndDelete({ _id: id });
export const updateUserById = (id: string, values: Record<string, any>) =>
  UserModel.findByIdAndUpdate(id, values);
export const removeEntryItem = (entryid: string, userid: string) =>
  UserModel.findByIdAndUpdate(
    { _id: userid },
    {
      $pull: {
        entries: {
          id: entryid,
        },
      },
    }
  );
export const updateEntryItem = (
  entryid: string,
  userid: string,
  status: string
) =>
  UserModel.findOneAndUpdate(
    { _id: userid, "entries.id": entryid }, // Find the user document by userid and the specific entry by entryid
    { $set: { "entries.$.status": status } }, // Update the status property of the specific entry
    { new: true } // Return the updated document
  );

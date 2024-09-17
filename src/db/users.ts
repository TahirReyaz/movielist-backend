import mongoose from "mongoose";
import { ActivityModel } from "./activities";

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
  count: Number,
  episodesWatched: Number,
  daysWatched: Number,
  daysPlanned: Number,
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

const StaffStatSchema = new mongoose.Schema({
  title: String,
  staffId: Number,
  profilePath: String,
  count: Number,
  meanScore: Number,
  timeWatched: Number,
  list: [StatEntrySchema],
});

const StatSchema = new mongoose.Schema({
  overview: OverviewSchema,
  genres: [StatRankingItemSchema],
  tags: [StatRankingItemSchema],
  cast: [StaffStatSchema],
  studios: [StatRankingItemSchema],
  crew: [StaffStatSchema],
});

export const UserSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    authentication: AuthSchema,
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
    followers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    following: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    stats: {
      movie: StatSchema,
      tv: StatSchema,
    },
  },
  {
    timestamps: true,
  }
);

export type Distribution = mongoose.InferSchemaType<typeof DistributionSchema>;
export type User = mongoose.InferSchemaType<typeof UserSchema>;
export type StaffStat = mongoose.InferSchemaType<typeof StaffStatSchema>;

// Cascade delete
UserSchema.pre(
  "deleteMany",
  { document: false, query: true },
  async function (next) {
    const filter = this.getFilter();
    const userid = filter._id;

    if (userid) {
      await ActivityModel.deleteMany({ owner: userid });
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
  })
    .populate("followers", "username avatar")
    .populate("following", "username avatar");

export const getUserById = (id: string) => UserModel.findById(id);

export const getUserByUsername = (username: string) =>
  UserModel.findOne({ username })
    .populate("followers", "username avatar")
    .populate("following", "username avatar");

export const searchUsers = (query: string) =>
  UserModel.find({ username: { $regex: query, $options: "i" } });

export const createUser = (values: Record<string, any>) =>
  new UserModel(values).save().then((user) => user.toObject());

export const deleteUserById = (id: mongoose.Types.ObjectId) =>
  UserModel.deleteMany({ _id: id });

export const updateUserById = (id: string, values: Record<string, any>) =>
  UserModel.findByIdAndUpdate(id, values);

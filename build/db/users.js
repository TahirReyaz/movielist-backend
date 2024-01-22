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
    lists: { type: [{ listtype: String, id: String }], required: true },
});
export const UserModel = mongoose.model("User", UserSchema);
export const getUsers = () => UserModel.find();
export const getUserByEmail = (email) => UserModel.findOne({ email });
export const getUserBySessionToken = (sessionToken) => UserModel.findOne({
    "authentication.sessionToken": sessionToken,
});
export const getUserById = (id) => UserModel.findById(id);
export const getUserByUsername = (username) => UserModel.findOne({ username });
export const createUser = (values) => new UserModel(values).save().then((user) => user.toObject());
export const deleteUserById = (id) => UserModel.findOneAndDelete({ _id: id });
export const updateUserById = (id, values) => UserModel.findByIdAndUpdate(id, values);
export const removeListItem = (listid, userid) => UserModel.findByIdAndUpdate({ _id: userid }, {
    $pull: {
        lists: {
            id: listid,
        },
    },
    // lists: {
    //   $filter: {
    //     input: "$lists",
    //     as: "item",
    //     cond: {
    //       "$$item.id": { $ne: listid },
    //     },
    //   },
    // },
});

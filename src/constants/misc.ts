import dotenv from "dotenv";

dotenv.config();

export const detailTranslation: any = {
  characters: "credits",
  tags: "keywords",
  recommendations: "similar",
};

export const TMDB_ENDPOINT = "https://api.themoviedb.org/3";
export const TMDB_API_KEY = process.env.TMDB_API_KEY;
export const FRONTEND_DOMAIN = process.env.FRONTEND_DOMAIN;
export const DEFAULT_AVATAR_URL =
  "https://firebasestorage.googleapis.com/v0/b/movie-list-3532f.appspot.com/o/user-avatar%2FuserAvatar.png?alt=media";
export const DEFAULT_ENTRY_BANNER_URL =
  "https://firebasestorage.googleapis.com/v0/b/movie-list-3532f.appspot.com/o/placeholders%2Fentry-banner-placeholder.jpg?alt=media&token=8ab96f18-9465-49a3-8448-c4f15561b001";

export const notificationTypes = [
  "airing",
  "activity",
  "forum",
  "follows",
  "media",
];

export const MediaStatus = {
  completed: "completed",
  watching: "watching",
  paused: "paused",
  dropped: "droppe",
  planning: "planning",
};

export const MediaType = {
  tv: "tv",
  movie: "movie",
  show: "tv",
};

export const mediaTypeEnum = ["movie", "tv"];

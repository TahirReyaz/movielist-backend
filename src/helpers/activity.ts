import { posterSizes, tmdbImgBaseUrl } from "../constants/tmdb";
import { MediaStatus } from "../constants/misc";
import { createActivity } from "../db/activities";
import { EntryDocument } from "./stats";

export const createActivityFromEntry = async (entry: EntryDocument) => {
  const image = `${tmdbImgBaseUrl}/${posterSizes.sm}${entry.poster}`;
  let action = "Plan to watch";
  if (entry.status == MediaStatus.completed) {
    action = "Completed";
  } else if (entry.status == MediaStatus.dropped) {
    action = "Dropped";
  } else if (entry.status == MediaStatus.paused) {
    action = "Paused watching";
  }
  await createActivity({
    image,
    action,
    owner: entry.userid,
    mediaid: entry.mediaid,
    mediaType: entry.mediaType,
    title: entry.title,
  });
};

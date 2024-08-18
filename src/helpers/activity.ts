import { posterSizes, tmdbImgBaseUrl } from "../constants/tmdb";
import { MediaStatus } from "../constants/misc";
import { createActivity } from "../db/activities";
import { EntryDocument } from "./stats";

export const createActivityFromEntry = async ({
  userid,
  poster,
  status,
  mediaid,
  mediaType,
  title,
}: {
  userid: string;
  poster: string;
  status: string;
  mediaid: number;
  mediaType: string;
  title: string;
}) => {
  const image = `${tmdbImgBaseUrl}/${posterSizes.sm}${poster}`;
  let action = "Plan to watch";
  if (status == MediaStatus.completed) {
    action = "Completed";
  } else if (status == MediaStatus.dropped) {
    action = "Dropped";
  } else if (status == MediaStatus.paused) {
    action = "Paused watching";
  }
  await createActivity({
    image,
    action,
    owner: userid,
    mediaid: mediaid,
    mediaType: mediaType,
    title: title,
  });
};

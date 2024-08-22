import { posterSizes, tmdbImgBaseUrl } from "../constants/tmdb";
import { MediaStatus } from "../constants/misc";
import { ActivityModel, createActivity } from "../db/activities";

export const createNewActivity = async ({
  userid,
  poster,
  status,
  mediaid,
  mediaType,
  title,
  progress,
  type = "media",
}: {
  userid: string;
  poster: string;
  status: string;
  mediaid: number;
  mediaType: string;
  title: string;
  progress?: number;
  type: "media" | "status";
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
  if (progress) {
    action = `Watched ep ${progress} of`;
  }
  await createActivity({
    image,
    action,
    owner: userid,
    mediaid: mediaid,
    mediaType: mediaType,
    title: title,
    type,
  });
};

export const getActivitiesCount = async () => {
  return ActivityModel.countDocuments().exec();
};

export const getUserActivitiesCount = async (userid: string) => {
  return ActivityModel.countDocuments({ owner: userid }).exec();
};

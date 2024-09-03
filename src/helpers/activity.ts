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
  } else if (status == MediaStatus.watching) {
    action = "Started watching";
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

export const getActivitiesCount = async (query?: any) => {
  return ActivityModel.countDocuments(query ?? {}).exec();
};

const generateLast168Days = (): string[] => {
  const result: string[] = [];
  const today = new Date();

  // Generate the last 168 days
  for (let i = 0; i < 168; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    result.push(date.toDateString());
  }

  return result.reverse();
};

export const countActivitiesPerDay = (
  activities: Array<{ createdAt: string | Date }>
) => {
  const last168Days = generateLast168Days();

  const activityCounts: Record<string, number> = {};

  last168Days.forEach((day) => {
    activityCounts[day] = 0;
  });

  activities.forEach((activity) => {
    if (!activity.createdAt) {
      return;
    }
    const activityDate = new Date(activity.createdAt).toDateString();
    if (activityCounts[activityDate] !== undefined) {
      activityCounts[activityDate]++;
    }
  });

  // Convert to the desired format
  const result = last168Days.map((day) => ({
    date: day,
    count: activityCounts[day],
  }));

  return result;
};

export const calculateActivityHistory = (dailyCounts: any) => {
  const weeklyGroups = [];

  for (let i = 0; i < dailyCounts.length; i += 7) {
    weeklyGroups.push(dailyCounts.slice(i, i + 7));
  }

  return weeklyGroups;
};

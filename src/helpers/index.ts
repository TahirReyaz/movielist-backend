import crypto from "crypto";
import dotenv from "dotenv";

dotenv.config();
type entryGrp = {
  planning: any[];
  watching: any[];
  dropped: any[];
  completed: any[];
  paused: any[];
};

export const random = () => crypto.randomBytes(128).toString("base64");
export const authentication = (salt: string, password: string) => {
  return crypto
    .createHmac("sha256", [salt, password].join("/"))
    .update(process.env.SECRET)
    .digest("hex");
};

export const transformEntries = (entries: any[] = []) => {
  if (entries.length > 0) {
    const movie: entryGrp = {
      planning: [],
      watching: [],
      dropped: [],
      completed: [],
      paused: [],
    };
    const tv: entryGrp = {
      planning: [],
      watching: [],
      dropped: [],
      completed: [],
      paused: [],
    };
    let totalMovie = 0;
    let totalTv = 0;

    entries.forEach((entry: any) => {
      if (entry.mediaType === "tv") {
        if (entry.status === "planning") {
          tv.planning.push(entry);
        } else if (entry.status === "watching") {
          tv.watching.push(entry);
        } else if (entry.status === "dropped") {
          tv.dropped.push(entry);
        } else if (entry.status === "completed") {
          tv.completed.push(entry);
        } else if (entry.status === "paused") {
          tv.paused.push(entry);
        }
        totalMovie++;
      } else {
        if (entry.status === "planning") {
          movie.planning.push(entry);
        } else if (entry.status === "watching") {
          movie.watching.push(entry);
        } else if (entry.status === "dropped") {
          movie.dropped.push(entry);
        } else if (entry.status === "completed") {
          movie.completed.push(entry);
        } else if (entry.status === "paused") {
          movie.paused.push(entry);
        }
        totalTv++;
      }
    });

    return {
      movie: {
        ...movie,
        count: totalMovie,
        planningCount: movie.planning.length,
        watchingCount: movie.watching.length,
        completedCount: movie.completed.length,
        pausedCount: movie.paused.length,
        droppedCount: movie.dropped.length,
      },
      tv: {
        ...tv,
        count: totalTv,
        planningCount: tv.planning.length,
        watchingCount: tv.watching.length,
        completedCount: tv.completed.length,
        pausedCount: tv.paused.length,
        droppedCount: tv.dropped.length,
      },
    };
  }
};

export const divideMediaByMediaType = (media: any[] = []) => {
  const movie: any[] = [];
  const tv: any[] = [];
  media.forEach((item: any) => {
    if (item.title) {
      movie.push(item);
    } else {
      tv.push(item);
    }
  });
  return { movie, tv };
};

export const divideMediaByYear = (mediaList: any[] = []) => {
  const transMediaMap: { [year: string]: any[] } = {};

  mediaList.forEach((media) => {
    const date = media.release_date || media.first_air_date;
    if (date) {
      const year = new Date(date).getFullYear().toString();
      if (!transMediaMap[year]) {
        transMediaMap[year] = [];
      }
      transMediaMap[year].push(media);
    }
  });

  const transMediaArray: any[] = [];
  for (const year in transMediaMap) {
    if (transMediaMap.hasOwnProperty(year)) {
      transMediaArray.push({ year, items: transMediaMap[year] });
    }
  }

  return transMediaArray;
};

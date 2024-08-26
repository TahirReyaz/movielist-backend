import crypto from "crypto";
import dotenv from "dotenv";

dotenv.config();

export const random = () => crypto.randomBytes(128).toString("base64");
export const authentication = (salt: string, password: string) => {
  return crypto
    .createHmac("sha256", [salt, password].join("/"))
    .update(process.env.SECRET)
    .digest("hex");
};

export const checkWhitespace = (str: string) => {
  return /\s/.test(str);
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

  return transMediaArray.reverse();
};

export const fuzzySearch = (query: string, title: string) => {
  // Convert both query and title to lowercase for case-insensitive comparison
  const queryWords = query.toLowerCase().split(" ");
  const titleWords = title.toLowerCase().split(" ");

  // Check if all query words are present in the title
  return queryWords.every((queryWord) =>
    titleWords.some((titleWord) => titleWord.includes(queryWord))
  );
};

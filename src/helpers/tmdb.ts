import axios from "axios";
import { TMDB_API_KEY, TMDB_ENDPOINT } from "../constants/misc";

export const translateBulkType = {
  trending: "popular",
  top: "top_rated",
  airing_today: "airing_today",
  on_the_air: "on_the_air",
  upcoming: "upcoming",
  now_playing: "now_playing",
  popular: "popular",
  top_rated: "top_rated",
};

export const fetchMediaData = async (mediaType: string, mediaid: number) => {
  try {
    const { data: mediaData } = await axios.get(
      `${TMDB_ENDPOINT}/${mediaType}/${mediaid}`,
      {
        params: {
          api_key: TMDB_API_KEY,
          append_to_response: "keywords,credits",
        },
      }
    );

    const tagData =
      mediaType == "tv"
        ? mediaData.keywords?.results
        : mediaData.keywords?.keywords;
    mediaData.tags = tagData.slice(0, 50);
    mediaData.cast = mediaData.credits?.cast.slice(0, 50);
    mediaData.crew = mediaData.credits?.crew.slice(0, 50);
    delete mediaData.keywords;
    delete mediaData.credits;

    return mediaData;
  } catch (error) {
    console.error(error);
    console.log({ mediaType, mediaid });
    return null;
  }
};

export const removeAnime = (results: any[]) => {
  const filteredResults = results?.filter((result: any) => {
    const hasGenre16 = result.genre_ids?.includes(16);
    const hasOriginCountryJP = result.original_language === "ja";
    return !(hasGenre16 && hasOriginCountryJP);
  });
  return filteredResults;
};

export const tmdbClient = axios.create({
  baseURL: TMDB_ENDPOINT,
  params: {
    api_key: TMDB_API_KEY,
  },
});

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
  delete mediaData.keywords;
  delete mediaData.credits;
  mediaData.tags = tagData;
  mediaData.cast = mediaData.credits?.cast;

  return mediaData;
};

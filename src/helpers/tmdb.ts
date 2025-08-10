import { ISeason, TTV } from "Interfaces/tmdb";
import tmdbClient from "../utils/api";

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

export const fetchMediaData = async (mediaType: string, mediaid: string) => {
  try {
    let mediaData;

    if (mediaType === "movie") {
      const { data: movieData } = await tmdbClient.get(
        `/${mediaType}/${mediaid}`,
        {
          params: {
            append_to_response: "keywords,credits",
          },
        }
      );
      mediaData = movieData;
    } else {
      const [showId, seasonNumber] = mediaid.split("-");

      console.log({ showId, seasonNumber });

      const showRes = await tmdbClient.get(`tv/${showId}`, {
        params: {
          append_to_response: "keywords",
        },
      });
      const showData: TTV & { keywords: any[] } = showRes.data;

      const seasonRes = await tmdbClient.get(
        `tv/${showId}/season/${seasonNumber}`,
        {
          params: {
            append_to_response: "credits",
          },
        }
      );
      const seasonData: ISeason & { credits: { cast: any[]; crew: any[] } } =
        seasonRes.data;

      // const seasonData = showData?.seasons.find(
      //   (season: any) => season.season_number === seasonNumber
      // );

      const transformedSeasonData: any = seasonData;
      transformedSeasonData.adult = showData.adult;
      transformedSeasonData.release_date = seasonData.air_date;
      transformedSeasonData.number_of_episodes = seasonData.episodes.length;
      transformedSeasonData.genres = showData.genres;
      transformedSeasonData.origin_country = showData.origin_country;
      transformedSeasonData.keywords = showData.keywords;
      transformedSeasonData.original_language = showData.original_language;
      transformedSeasonData.vote_average = seasonData.vote_average;
      transformedSeasonData.credits = seasonData.credits;

      let totalRunTime = 0;
      seasonData.episodes.forEach(
        (episode) => (totalRunTime += episode.runtime)
      );

      transformedSeasonData.run_time =
        totalRunTime / seasonData.episodes.length;

      mediaData = transformedSeasonData;
      console.log("mediaData", mediaData);
      // add cast and crew data and tag data
    }

    const tagData =
      mediaType == "tv"
        ? mediaData.keywords?.results
        : mediaData.keywords?.keywords;
    mediaData.tags = tagData?.slice(0, 20);
    mediaData.cast = mediaData.credits?.cast.slice(0, 20);
    mediaData.crew = mediaData.credits?.crew.slice(0, 20);
    delete mediaData.keywords;
    delete mediaData.credits;

    return mediaData;
  } catch (error) {
    console.error(error);
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

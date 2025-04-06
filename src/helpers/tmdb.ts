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

      const { data: showData } = await tmdbClient.get(`/tv/${showId}`, {
        params: {
          append_to_response: "keywords",
        },
      });

      const seasonData = showData?.seasons.find(
        (season: any) => season.season_number === seasonNumber
      );

      seasonData.number_of_episodes = seasonData.episode_count;
      seasonData.first_air_date = seasonData.air_date;
      seasonData.genres = showData.genres;
      seasonData.origin_country = showData.origin_country;
      seasonData.keywords = showData.keywords;
      const totalRunTime = showData.episode_run_time.reduce(
        (accumulator: number, currentValue: number) =>
          accumulator + currentValue,
        0
      );
      seasonData.episode_run_time = totalRunTime / seasonData.episode_count;

      mediaData = seasonData;
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

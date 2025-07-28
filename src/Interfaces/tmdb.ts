export interface ISeason {
  air_date: string;
  episodes: TEpisode[];
  id: string;
  name: string;
  overview: string;
  poster_path: string;
  season_number: number;
  vote_average: number;
  showid: string;
  backdrop_path: string;
}

export type TEpisode = {
  id: number;
  name: string;
  overview: string;
  vote_average: number;
  vote_count: number;
  air_date: string;
  episode_number: number;
  episode_type: string;
  production_code: string;
  runtime: number;
  season_number: number;
  show_id: number;
  still_path: string;
  crew: ICrewMember[];
  guest_stars: ICastMember[];
};

export interface ICrewMember
  extends Omit<
    IStaffDetails,
    | "biography"
    | "also_known_as"
    | "birthday"
    | "deathday"
    | "homepage"
    | "place_of_birth"
    | "imdb id"
  > {
  department: string;

  job: string;

  credit_id: string;
}

export interface ICastMember
  extends Omit<
    IStaffDetails,
    | "biography"
    | "also_known_as"
    | "birthday"
    | "deathday"
    | "homepage"
    | "place_of_birth"
    | "imdb id"
  > {
  cast_id: number;
  character: string;
  order: number;
  credit_id: string;
}

export interface IStaffDetails {
  adult: boolean;

  also_known_as: string[];

  biography: string;

  birthday: string;

  deathday: string | null;

  gender: number;

  homepage: string | null;

  id: number;

  imdb_id: string;

  known_for_department: string;

  name: string;

  place_of_birth: string;

  popularity: number;

  profile_path: string | null;

  external_ids?: TStaffExternalLinks;
}

export type TStaffExternalLinks = {
  imdb_id?: string | null;

  wikidata_id?: string | null;

  facebook_id?: string | null;

  instagram_id?: string | null;

  youtube_id?: string | null;

  twitter_id?: string | null;
};

export type TMediaType =
  | "movie"
  | "tv"
  | "staff"
  | "user"
  | "users"
  | "studios";

type TMediaDetailBase<T extends TMediaType> = {
  type: T;

  adult: boolean;

  backdrop_path: string;

  homepage: string;

  id: string;

  original_language: string;

  overview: string;

  popularity: number;

  poster_path: string;

  production_companies: TProductionCompany[];

  production_countries: TProductionCountry[];

  spoken_languages: TLanguage[];

  status: string;

  tagline: string;

  vote_average: number;

  vote_count: number;
};

export type TMovie = TMediaDetailBase<"movie"> & {
  belongs_to_collection: ICollectionInMedia;

  budget: number;

  genre_ids: TMediaDetailGenre[];

  imdb_id: string;

  original_title: string;

  release_date: string;

  revenue: number;

  runtime: number;

  title: string;

  video: boolean;
};

export type TTV = TMediaDetailBase<"tv"> & {
  created_by: TTVCreator[];

  episode_run_time: number[];

  first_air_date: string;

  genres: TMediaDetailGenre[];

  in_production: boolean;

  languages: string[];

  last_air_date: string;

  last_episode_to_air: TEpisode;

  name: string;

  next_episode_to_air: string;

  networks: TNetwork[];

  number_of_episodes: number;

  number_of_seasons: number;

  origin_country: string[];

  original_name: string;

  seasons: ITVSeason[];

  type: string;
};

export type ITVSeason = {
  air_date: string;

  episode_count: number;

  id: number;

  name: string;

  overview: string;

  poster_path: string;

  season_number: number;

  vote_average: number;
};

export type TMediaDetailGenre = {
  id: number;

  name: string;
};

export type TNetwork = {
  id: number;

  logo_path: string;

  name: string;

  origin_country: string;
};

export type TProductionCompany = {
  id: number;

  logo_path: string;

  name: string;

  origin_country: string;
};

export type TProductionCountry = {
  iso_3166_1: string;

  name: string;
};

export type TLanguage = {
  english_name: string;

  iso_639_1: string;

  name: string;
};

export interface ICollectionInMedia {
  id: number;

  name: string;

  poster_path: string;

  backdrop_path: string;
}

export type TTVCreator = {
  id: number;

  credit_id: string;

  name: string;

  gender: number;

  profile_path: string;
};

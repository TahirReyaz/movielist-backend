import axios from "axios";

import { TMDB_API_KEY, TMDB_ENDPOINT } from "../constants/misc";

export default axios.create({
  baseURL: TMDB_ENDPOINT,
  params: {
    api_key: TMDB_API_KEY,
  },
});

import { Season } from "./constants/types";

export const getSeason = (dateString: string): Season => {
  const month = new Date(dateString).getUTCMonth() + 1; // Months are zero-based
  if (month >= 1 && month <= 3) {
    return "spring";
  } else if (month >= 4 && month <= 6) {
    return "summer";
  } else if (month >= 7 && month <= 9) {
    return "fall";
  } else {
    return "winter";
  }
};

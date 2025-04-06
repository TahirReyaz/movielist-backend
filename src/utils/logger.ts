export const logTMDBError = (
  path: string,
  error: any,
  title: string,
  req: any
) => {
  console.error(error);
  console.error(`Error occurred while fetching ${title} at`, "path", path);
};

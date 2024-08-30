import { CommentModel } from "../db/comments";

export const getCommentsCount = async (query?: any) => {
  return CommentModel.countDocuments(query ?? {}).exec();
};

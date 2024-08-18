import mongoose from "mongoose";

export const ReviewSchema = new mongoose.Schema(
  {
    mediaid: Number,
    mediaType: String,
    title: String,
    likes: [String],
    dislikes: [String],
    content: String,
    summary: String,
    ownerid: String,
    score: Number,
  },
  {
    timestamps: true,
  }
);

export type Review = mongoose.InferSchemaType<typeof ReviewSchema>;

export const ReviewModel = mongoose.model("Review", ReviewSchema);

export const getReviews = () => ReviewModel.find();
export const getReviewById = (id: string) => ReviewModel.findById(id);
export const createReview = (values: Record<string, any>) =>
  new ReviewModel(values).save().then((activity) => activity.toObject());
export const deleteReviewById = (id: string) =>
  ReviewModel.findOneAndDelete({ _id: id });
export const updateReviewById = (id: string, values: Record<string, any>) =>
  ReviewModel.findByIdAndUpdate(id, values);

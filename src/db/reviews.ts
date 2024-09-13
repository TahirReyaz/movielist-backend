import mongoose from "mongoose";

export const ReviewSchema = new mongoose.Schema(
  {
    mediaid: { type: String, required: true },
    mediaType: { type: String, required: true },
    title: { type: String, required: true },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    dislikes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    content: { type: String, required: true },
    summary: { type: String, required: true },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    score: { type: Number, required: true },
    private: { type: Boolean, default: false },
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

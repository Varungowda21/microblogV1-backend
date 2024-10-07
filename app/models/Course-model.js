import { Schema, model } from "mongoose";

const CourseSchema = new Schema(
  {
    title: {
      type: String,
      required: [true, "Please enter course title"],
      minLength: [4, '"title must be atleast 4 characters'],
      maxLength: [80, "title should not exceed 80 characters"],
    },
    description: {
      type: String,
      required: [true, "Please enter description"],
      minLength: [10, "description must be atleast 10 characters"],
    },
    createdBy: {
      type: String,
      required: [true, "Enter course creater name"],
    },
    InstucterId: Schema.Types.ObjectId,
    category: {
      type: String,
      required: true,
    },
    poster: {
      public_id: {
        type: String,
        required: true,
      },
      url: {
        type: String,
        required: true,
      },
    },
    lectures: [
      {
        title: {
          type: String,
          required: true,
        },
        description: {
          type: String,
          required: true,
        },
        video: {
          public_id: {
            type: String,
            required: true,
          },
          url: {
            type: String,
            required: true,
          },
        },
      },
    ],
    views: {
      type: Number,
      default: 0,
    },
    numofVideos: {
      type: Number,
      default: 0,
    },
    numOfStudAddedToMyLearning: [
      {
        type: Schema.Types.ObjectId,
      },
    ],
  },
  { timestamps: true }
);

export const Course = model("Course", CourseSchema);

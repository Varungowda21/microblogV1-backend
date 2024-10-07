import { Schema, model } from "mongoose";

const CourseReqSchema = new Schema({
  name: String,
  email: String,
  course:String
});

export const CourseReq = model("CourseReq", CourseReqSchema);

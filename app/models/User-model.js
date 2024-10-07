import mongoose, { Schema, model } from "mongoose";
import validator from "validator";

const UserSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Please enter your name"],
    },
    email: {
      type: String,
      required: [true, "Please enter your email"],
      unique: true,
      validate: validator.isEmail,
    },
    password: {
      type: String,
      required: [true, "Please enter your password"],
      minLength: [6, "password must be atleast 6 characters"],
      select: false,
    },
    role: {
      type: String,
      // enum: ["admin", "user"],
      // default: "user",
    },
    subscription: {
      id: String,
      status: {
        type: String,
        default: "Not active",
      },
    },
    avatar: {
      public_id: {
        type: String,
        required: true,
      },
      url: {
        type: String,
        required: true,
      },
    },
    mylearnings: [
      {
        course: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "course",
        },
        poster: String,
      },
    ],
    isApproved: {
      type: Boolean,
      default: false,
    },
    resetPasswordToken: String,
    resetPasswordExpire: String,
  },
  { timestamps: true }
);

export const User = model("User", UserSchema);

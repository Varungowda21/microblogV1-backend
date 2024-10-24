import { User } from "../models/User-model.js";
import { Course } from "../models/Course-model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { sendEmail } from "../../utils/sendEmail.js";
import getDataUri from "../../utils/dataUri.js";
import cloudinary from "cloudinary";

const userCtrl = {};

userCtrl.register = async (req, res) => {
  const { name, email, password, role } = req.body;
  const file = req.file;

  console.log("inside user ctl register");
  try {
    let userAlready = await User.findOne({ email });
    if (userAlready)
      return res.status(400).json({ message: "Email already exist" });
    const fileUri = getDataUri(file);
    const mycloud = await cloudinary.v2.uploader.upload(fileUri.content);
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);
    const user = await User.create({
      name,
      email,
      password: hash,
      avatar: {
        public_id: mycloud.public_id,
        url: mycloud.secure_url,
      },
      role,
    });

    await user.save();
    const tokenData = {
      userId: user._id,
      role: user.role,
      subscription: user.subscription,
    };
    // console.log(tokenData);
    const token = jwt.sign(tokenData, process.env.SECREAT_KEY, {
      expiresIn: "7d",
    });
    return res.status(200).json({
      message: "Registration successfull " + user.name,
      token, // Send the token to be stored client-side
      user,
    });
    // res.status(201).json(user);
  } catch (err) {
    res.status(500).json({ error: "something went wrong" });
  }
};

userCtrl.login = async (req, res) => {
  const { email, password } = req.body;
  // console.log(email, password);
  try {
    const user = await User.findOne({ email }).select("+password");
    // console.log("user", user);
    if (!user) {
      return res.status(404).json({ message: "Invalid email" });
    }
    // console.log("below");
    const isValid = await bcrypt.compare(password, user.password);
    // console.log("below 2");
    // console.log(isValid);
    if (!isValid) {
      return res.status(404).json({ message: "Invalid password" });
    }
    const tokenData = {
      userId: user._id,
      role: user.role,
      subscription: user.subscription,
    };
    // console.log(tokenData);
    const token = jwt.sign(tokenData, process.env.SECREAT_KEY, {
      expiresIn: "7d",
    });
    return res.status(200).json({
      message: "Welcome back " + user.name,
      token, // Send the token to be stored client-side
      user,
    });
  } catch (err) {
    res.status(500).json({ error: "something went wrong" });
  }
};

userCtrl.getMyProfile = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    return res.json(user);
  } catch (err) {
    res.status(500).json({ error: "something went wrong" });
  }
};

userCtrl.updateProfilePic = async (req, res) => {
  const file = req.file;
  try {
    const user = await User.findById(req.userId);
    const fileUri = getDataUri(file);
    const mycloud = await cloudinary.v2.uploader.upload(fileUri.content);

    await cloudinary.v2.uploader.destroy(user.avatar.public_id);

    user.avatar = {
      public_id: mycloud.public_id,
      url: mycloud.secure_url,
    };
    await user.save();
    res.status(200).json({ message: "Profice pic updated" });
  } catch (err) {
    res.status(500).json({ error: "something went wrong" });
  }
};

userCtrl.changePassword = async (req, res) => {
  const { oldpassword, newpassword } = req.body;
  try {
    const user = await User.findById(req.userId).select("+password");
    const isValid = await bcrypt.compare(oldpassword, user.password);
    // console.log(isValid);
    if (!isValid) {
      return res.status(400).json({ message: "incorrect old password" });
    }
    const salt = await bcrypt.genSalt(10);
    const newHashPassword = await bcrypt.hash(newpassword, salt);

    user.password = newHashPassword;
    await user.save();
    res.status(200).json({ message: "Password changed successfully" });
  } catch (err) {
    res.status(500).json({ error: "something went wrong" });
  }
};

userCtrl.updateProfile = async (req, res) => {
  const { name, email } = req.body;
  try {
    const user = await User.findById(req.userId);
    if (name) user.name = name;
    if (email) user.email = email;
    await user.save();
    res.status(200).json({ message: "Profile updated successfully" });
  } catch (err) {
    res.status(500).json({ error: "something went wrong" });
  }
};

//updateprofilepic TODO

userCtrl.forgotPassword = async (req, res) => {
  const { email } = req.body;
  try {
    if (!email) {
      return res.status(400).json({ message: "please provide email" });
    }
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "user not found" });
    }
    // console.log(user);
    const tokenGeneration = crypto.randomBytes(20).toString("hex");
    // console.log(tokenGeneration);
    const hashOfgeneratedToken = crypto
      .createHash("sha256")
      .update(tokenGeneration)
      .digest("hex");
    // console.log("bl");

    // console.log(hashOfgeneratedToken);
    user.resetPasswordToken = hashOfgeneratedToken;
    user.resetPasswordExpire = Date.now() + 15 * 60 * 1000;
    await user.save();
    const subject = "Reset link for SkillBoost.com";
    const text = `password reset here ${process.env.FRONTEND_URL}/reset-password/${tokenGeneration}`;
    sendEmail(user.email, subject, text);
    return res.status(200).json({
      message: "password link sent to your mail",
    });
  } catch (err) {
    return res.status(500).json({ error: "something went wrong" });
  }
};

userCtrl.resetPassword = async (req, res) => {
  const { token } = req.params;

  const resetPasswordToken = crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
  try {
    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: {
        $gt: Date.now(),
      },
    });

    if (!user) {
      return res
        .status(400)
        .json({ message: "token is invalid or has been expired" });
    }
    const newPassword = req.body.password;
    const salt = await bcrypt.genSalt(10);
    const newHashPassword = await bcrypt.hash(newPassword, salt);
    user.password = newHashPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    res.status(200).json({ message: "password reset successfulyy" });
  } catch (err) {
    return res.status(500).json({ error: "something went wrong" });
  }
};

//add to my learnings

userCtrl.addToLearnigs = async (req, res) => {
  // const {courseId} = req.body;
  try {
    const user = await User.findById(req.userId);
    const course = await Course.findById(req.body.id);
    if (!course) return res.status(404).json({ message: "Invalid course Id" });

    const itemExist = user.mylearnings.find((item) => {
      if (item.course.toString() === course._id.toString()) return true;
    });
    if (itemExist)
      return res.status(400).json({ message: "Item already exists" });

    user.mylearnings.push({
      course: course._id,
      poster: course.poster.url,
    });

    course.numOfStudAddedToMyLearning.push(req.userId);

    await user.save();
    await course.save();
    res.status(200).json({ message: "Added to my learning" });
  } catch (err) {
    return res.status(500).json({ error: "something went wrong" });
  }
};

userCtrl.removeFromLearning = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    const course = await Course.findById(req.query.id);
    if (!course) return res.status(404).json({ message: "Invalid course Id" });

    const newMyLearnings = user.mylearnings.filter((item) => {
      return item.course.toString() !== course._id.toString();
    });
    user.mylearnings = newMyLearnings;
    course.numOfStudAddedToMyLearning.pull(req.userId);
    await user.save();
    await course.save();

    res.status(200).json({ message: "course removed from myLearning" });
  } catch (err) {
    return res.status(500).json({ error: "something went wrong" });
  }
};

userCtrl.getAllUsers = async (req, res) => {
  try {
    const users = await User.find({});
    res.status(200).json(users);
  } catch (err) {
    return res.status(500).json({ error: "something went wrong" });
  }
};

userCtrl.deleteUser = async (req, res) => {
  const { id } = req.params;
  try {
    const user = await User.findById(id);
    if (user.role == "admin")
      return res
        .status(404)
        .json({ message: "You cannot delete your account" });
    if (!user) return res.status(404).json({ message: "user not found" });
    await cloudinary.v2.uploader.destroy(user.avatar.public_id);

    //cancel subscription

    await user.deleteOne();
    res.status(200).json({
      message: "User deleted successfully",
    });
  } catch (err) {
    res.status(500).json({ error: "something went wrong" });
  }
};

// api is created but in frontend this feature is not implemented
userCtrl.deleteMyProfile = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: "user not found" });
    await cloudinary.v2.uploader.destroy(user.avatar.public_id);

    //cancel subscription

    await user.deleteOne();
    res.status(200).json({ message: "Your account deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: "something went wrong" });
  }
};

userCtrl.approveInstructor = async (req, res) => {
  const { id } = req.body;
  try {
    const user = await User.findByIdAndUpdate(
      id,
      { isApproved: true }, // Update the isApproved field
      { new: true } // Return the updated document
    );
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.status(200).json({ message: "Instructor approved successfully" });
  } catch (err) {
    res.status(500).json({ error: "Something went wrong" });
  }
};

export default userCtrl;


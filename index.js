import express from "express";
import dotenv from "dotenv";
import ConfigureDB from "./config/db.js";
import userCtrl from "./app/controllers/User-ctrl.js";
import courseCtrl from "./app/controllers/Course-ctrl.js";
import authenticateUser from "./app/middlewares/AuthenticateUser.js";
import authorizeUser from "./app/middlewares/AuthorizeUser.js";
import singleUpload from "./app/middlewares/multer.js";
import cloudinary from "cloudinary";
import Razorpay from "razorpay";
import paymentCtrl from "./app/controllers/Payment-ctrl.js";
import { authorizeSubscriber } from "./app/middlewares/AuthorizeSubscriber.js";
import {
  contact,
  getAllCourseRequest,
  sendCourseRequest,
} from "./app/controllers/Other-ctrl.js";

import { getDashboardStats } from "./app/controllers/Other-ctrl.js";
import cors from "cors";

dotenv.config();
ConfigureDB();
const port = process.env.PORT || 3081;
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // To handle URL-encoded bodies

app.use(cors());

cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLIENT_NAME,
  api_key: process.env.CLODINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECREAT,
});

export const instance = new Razorpay({
  key_id: process.env.RAZORPAY_API_KEY,
  key_secret: process.env.RAZORPAY_API_SECREAT,
});

// buy subscription
app.get("/api/v1/subscribe", authenticateUser, paymentCtrl.buySubscription);
// payment verification and save reference in db
app.post(
  "/api/v1/paymentverification",
  authenticateUser,
  paymentCtrl.paymentVerification
);
// Get razor pay key
app.get("/api/v1/razorpaykey", paymentCtrl.getRazorPayKey);
// cancel subscription and refund amount
app.delete(
  "/api/v1/subscribe/cancel",
  authenticateUser,
  paymentCtrl.cancelSubscription
);

app.post("/api/v1/register", singleUpload, userCtrl.register);
app.post("/api/v1/login", userCtrl.login);

// create a course by instructor only
app.post(
  "/api/v1/createcourse",
  authenticateUser,
  authorizeUser(["instructor"]),
  singleUpload,
  courseCtrl.createCourse
);

// get all course without lectures array
app.get("/api/v1/getallcourses", courseCtrl.getAllCourses);

// delete course by admin and instructor only
app.delete(
  "/api/v1/course/:id",
  authenticateUser,
  authorizeUser(["admin", "instructor"]),
  courseCtrl.deleteCourse
);

//get instrucor course list
app.get(
  "/api/v1/instructorCourse",
  authenticateUser,
  authorizeUser(["instructor"]),
  courseCtrl.getInstructorCourse
);

// get all lectures of the course
app.get(
  "/api/v1/course/:id",
  authenticateUser,
  authorizeSubscriber,
  courseCtrl.getCourseLectures
);

// create a course lectures by instructor only
app.post(
  "/api/v1/course/:id",
  authenticateUser,
  authorizeUser(["instructor"]),
  singleUpload,
  courseCtrl.addLecture
);

// delete a course lecture by admin and instructor only
app.delete(
  "/api/v1/deletelecture",
  authenticateUser,
  authorizeUser(["instructor", "admin"]),
  courseCtrl.deleteLecture
);

app.put(
  "/api/v1/editlecture",
  authenticateUser,
  authorizeUser(["instructor"]),
  singleUpload,
  courseCtrl.editLecture
);

//get my profile
app.get("/api/v1/profile", authenticateUser, userCtrl.getMyProfile);
//change password
app.put("/api/v1/changepassword", authenticateUser, userCtrl.changePassword);
//update profile
app.put("/api/v1/updateprofile", authenticateUser, userCtrl.updateProfile);
//update profilepic
app.put(
  "/api/v1/updateprofilepic",
  authenticateUser,
  singleUpload,
  userCtrl.updateProfilePic
);

//add to My learing
app.post(
  "/api/v1/add-to-my-learning",
  authenticateUser,
  userCtrl.addToLearnigs
);
//delete from learning
app.delete(
  "/api/v1/delete-from-learning",
  authenticateUser,
  userCtrl.removeFromLearning
);

//forgot-password
app.post("/api/v1/forgot-password", userCtrl.forgotPassword);
//reset-password
app.put("/api/v1/reset-password/:token", userCtrl.resetPassword);

//Admin roles
// Get all users
app.get(
  "/admin/users",
  authenticateUser,
  authorizeUser(["admin"]),
  userCtrl.getAllUsers
);

//Delete user
app.delete(
  "/admin/user/:id",
  authenticateUser,
  authorizeUser(["admin"]),
  userCtrl.deleteUser
);

//approve instructor by admin
app.put(
  "/admin/approveInstructor",
  authenticateUser,
  authorizeUser(["admin"]),
  userCtrl.approveInstructor
);

//Delete my profile
app.delete(
  "/api/v1/deletemyprofile",
  authenticateUser,
  userCtrl.deleteMyProfile
);

// api for sending contact info through email
app.post("/api/v1/contact", contact.contactThroughEmail);

// to get stats by admin only
app.get(
  "/api/v1/admin/stats",
  authenticateUser,
  authorizeUser(["admin"]),
  getDashboardStats
);

//to get course requests by admin and instructor
app.get(
  "/admin-instructor/getAllCourseReq",
  authenticateUser,
  authorizeUser(["instructor", "admin"]),
  getAllCourseRequest
);

// to sent course request by user
app.post("/api/v1/courseRequest", sendCourseRequest);

app.listen(port, () => {
  console.log("server running on port " + port);
});

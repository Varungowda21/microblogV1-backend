import { sendEmail } from "../../utils/sendEmail.js";
import { CourseReq } from "../models/CourseRequest-model.js";
import { User } from "../models/User-model.js";
import { Course } from "../models/Course-model.js";

export const contact = {};

contact.contactThroughEmail = async (req, res) => {
  try {
    const { name, email, message } = req.body;

    const to = process.env.MY_MAIL;
    const subject = "Contact from SkillBoost";
    const text = `name:${name} email:${email} \n ${message}`;
    await sendEmail(to, subject, text);

    res.status(200).json({ message: "Your message sent successfuly" });
  } catch (err) {
    res.status(500).json({ error: "something went wrong" });
  }
};

export const sendCourseRequest = async (req, res) => {
  const { name, email, course } = req.body;
  try {
    const courseReq = new CourseReq({ name, email, course });
    await courseReq.save();
    res.status(201).json({ message: "courseRequest sent successfully" });
  } catch (err) {
    res.status(500).json({ error: "something went wrong" });
  }
};

export const getAllCourseRequest = async (req, res) => {
  try {
    const couresReqs = await CourseReq.find();
    res.status(200).json(couresReqs);
  } catch {
    res.status(500).json({ error: "something went wrong" });
  }
};
export const getDashboardStats = async (req, res) => {
  try {
    const usersCount = await User.countDocuments();
    const subscriptionCount = await (
      await User.find({ "subscription.status": "active" })
    ).length;
    const courses = await Course.find({});
    let viewsCount = 0;

    for (let i = 0; i < courses.length; i++) {
      viewsCount += courses[i].views;
    }
    res.status(200).json({
      // stats: statsData,
      usersCount,
      subscriptionCount,
      viewsCount,
      // usersPercentage,
      // viewsPercentage,
      // subscriptionPercentage,
      // usersProfit,
      // viewsProfit,
      // subscriptionProfit,
    });
  } catch (err) {
    res.status(500).json({ error: "something went wrong" });
  }
};

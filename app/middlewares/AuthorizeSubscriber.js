import { User } from "../models/User-model.js";

export const authorizeSubscriber = async (req, res, next) => {
  // console.log(req.role, req.subscription.status);
  const user = await User.findById(req.userId);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }
  if (
    user.subscription.status !== "active" &&
    user.role !== "admin" &&
    user.role !== "instructor"
  ) {
    return res
      .status(403)
      .json({ message: "Only subscribers can access this course" });
  }
  next();
};

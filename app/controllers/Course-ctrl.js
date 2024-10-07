import getDataUri from "../../utils/dataUri.js";
import { Course } from "../models/Course-model.js";
import cloudinary from "cloudinary";

const courseCtrl = {};

courseCtrl.createCourse = async (req, res) => {
  const { title, description, category, createdBy } = req.body;

  const file = req.file;
  // console.log(file);
  const fileUri = getDataUri(file);
  // console.log(fileUri);
  const mycloud = await cloudinary.v2.uploader.upload(fileUri.content);

  try {
    const course = await Course.create({
      title,
      description,
      category,
      createdBy,
      poster: {
        public_id: mycloud.public_id,
        url: mycloud.secure_url,
      },
    });
    course.InstucterId = req.userId;
    await course.save();
    res.status(201).json({ message: "course created successfully" });
  } catch (err) {
    console.error("Error saving course:", err);
    res.status(500).json({ error: "something went wrong" });
  }
};

courseCtrl.getAllCourses = async (req, res) => {
  const keyword = req.query.keyword || "";
  const category = req.query.category || "";
  try {
    const Courses = await Course.find({
      title: {
        $regex: keyword,
        $options: "i",
      },
      category: {
        $regex: category,
        $options: "i",
      },
    }).select("-lectures");
    res.json(Courses);
  } catch (err) {
    res.status(500).json({ error: "something went wrong" });
  }
};

courseCtrl.getCourseLectures = async (req, res) => {
  const { id } = req.params;
  try {
    const course = await Course.findById(id);
    if (!course) return res.status(404).json({ message: "Course not found" });
    course.views += 1;
    await course.save();
    res.status(200).json({ lectures: course.lectures });
  } catch (err) {
    res.status(500).json({ error: "something went wrong" });
  }
};

courseCtrl.deleteCourse = async (req, res) => {
  const { id } = req.params;
  try {
    const course = await Course.findById(id);
    if (!course) return res.status(404).json({ message: "Course not found" });
    await cloudinary.v2.uploader.destroy(course.poster.public_id);

    for (let i = 0; i < course.lectures.length; i++) {
      const singleLecture = course.lectures[i];
      await cloudinary.v2.uploader.destroy(singleLecture.video.public_id, {
        resource_type: "video",
      });
      // console.log(singleLecture.video.public_id);
    }
    await course.deleteOne();
    res.status(200).json({ message: "course deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: "something went wrong" });
  }
};

// max video size 100mb

courseCtrl.addLecture = async (req, res) => {
  const { id } = req.params;
  const { title, description } = req.body;

  const file = req.file;
  console.log(file);
  const fileUri = getDataUri(file);
  // console.log(fileUri);
  const mycloud = await cloudinary.v2.uploader.upload(fileUri.content, {
    resource_type: "video",
  });

  try {
    const course = await Course.findById(id);
    if (!course) return res.status(404).json({ message: "Course not found" });

    //upload file here

    course.lectures.push({
      title,
      description,
      video: {
        public_id: mycloud.public_id,
        url: mycloud.secure_url,
      },
    });

    course.numofVideos = course.lectures.length;
    await course.save();

    res.status(200).json({ message: "Lecture added successfully" });
  } catch (err) {
    res.status(500).json({ error: "something went wrong" });
  }
};

courseCtrl.deleteLecture = async (req, res) => {
  const { courseId, lectureId } = req.query;
  try {
    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ message: "Course not found" });

    const lecture = course.lectures.find((ele) => {
      return ele._id.toString() === lectureId.toString();
    });
    await cloudinary.v2.uploader.destroy(lecture.video.public_id, {
      resource_type: "video",
    });

    course.lectures = course.lectures.filter((ele) => {
      return ele._id.toString() !== lectureId.toString();
    });

    course.numofVideos = course.lectures.length;

    await course.save();

    res.status(200).json({ message: "lecture deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: "something went wrong" });
  }
};

courseCtrl.editLecture = async (req, res) => {
  const { courseId, lectureId } = req.query;
  const { title, description } = req.body;
  const file = req.file;
  try {
    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ message: "Course not found" });

    const lecture = course.lectures.find(
      (ele) => ele._id.toString() === lectureId.toString()
    );
    if (!lecture) return res.status(404).json({ message: "Lecture not found" });

    if (title) lecture.title = title;
    if (description) lecture.description = description;

    if (file) {
      await cloudinary.v2.uploader.destroy(lecture.video.public_id, {
        resource_type: "video",
      });
      const fileUri = getDataUri(file);
      const mycloud = await cloudinary.v2.uploader.upload(fileUri.content, {
        resource_type: "video",
      });

      lecture.video.public_id = mycloud.public_id;
      lecture.video.url = mycloud.secure_url;
    }

    await course.save();

    res.status(200).json({ message: "lecture edited successfully" });
  } catch (err) {
    res.status(500).json({ error: "something went wrong" });
  }
};

courseCtrl.getInstructorCourse = async (req, res) => {
  try {
    const courses = await Course.find({ InstucterId: req.userId });
    res.json(courses);
  } catch (err) {
    res.status(500).json({ error: "something went wrong" });
  }
};

export default courseCtrl;

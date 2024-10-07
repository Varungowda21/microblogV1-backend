import { instance } from "../../index.js";
import { Payment } from "../models/Payment-model.js";
import { User } from "../models/User-model.js";
import crypto from "crypto";
import { sendEmail } from "../../utils/sendEmail.js";

const paymentCtrl = {};

paymentCtrl.buySubscription = async (req, res) => {
  try {
    console.log("I b");
    const user = await User.findById(req.userId);
    if (user.role == "admin")
      return res.status(400).json({ message: "admin cann't buy subscription" });

    const plan_id = process.env.PLAN_ID;
    // console.log(plan_id);
    const subscription = await instance.subscriptions.create({
      plan_id,
      customer_notify: 1,
      quantity: 1,
      total_count: 12,
    });

    user.subscription.id = subscription.id;

    user.subscription.status = subscription.status;

    await user.save();

    res.status(201).json({ subscriptionId: subscription.id, subscription });
  } catch (err) {
    res.status(500).json({ error: "something went wrong" });
  }
};

paymentCtrl.getRazorPayKey = async (req, res) => {
  res.status(200).json({ key: process.env.RAZORPAY_API_KEY });
};

paymentCtrl.paymentVerification = async (req, res) => {
  console.log("I P V");
  const { razorpay_signature, razorpay_payment_id, razorpay_subscription_id } =
    req.body;
  // console.log(req.body);

  try {
    const user = await User.findById(req.userId);
    const subscription_id = user.subscription.id;
    // console.log(subscription_id);

    const generated_signature = crypto
      .createHmac("sha256", process.env.RAZORPAY_API_SECREAT)
      .update(razorpay_payment_id + "|" + subscription_id, "utf-8")
      .digest("hex");
    // console.log(generated_signature);
    // console.log(razorpay_signature);
    const isAuthentic = generated_signature == razorpay_signature;
    // console.log(isAuthentic);
    if (!isAuthentic)
      return res.redirect(`${process.env.FRONTEND_URL}/payment-fail`);

    await Payment.create({
      razorpay_signature,
      razorpay_payment_id,
      razorpay_subscription_id,
    });

    user.subscription.status = "active";
    // req.subscription.status = "active";
    // console.log(req.subscription.status);
    const to = user.email;
    const subject = "SkillBoost";
    const text = `name:${user.name} \n email:${user.email} \n congratulations You have been subscribed to skillboost`;
    await sendEmail(to, subject, text);

    await user.save();

    res.redirect(
      `${process.env.FRONTEND_URL}/payment-success?reference=${razorpay_payment_id}`
    );
  } catch (err) {
    res.status(500).json({ error: "something went wrong" });
  }
};

paymentCtrl.cancelSubscription = async (req, res) => {
  console.log("i c");
  try {
    const user = await User.findById(req.userId);
    const subscriptionId = user.subscription.id;
    console.log(user);
    console.log(subscriptionId);
    //refund remaining
    let refund = false;
    await instance.subscriptions.cancel(subscriptionId);
    const payment = await Payment.findOne({
      razorpay_subscription_id: subscriptionId,
    });
    console.log(payment);
    const gap = Date.now() - payment.createdAt;
    const refundTime = process.env.REFUND_TIME * 24 * 60 * 60 * 1000;

    console.log(gap);

    if (refundTime > gap) {
      console.log("r true");

      await instance.payments.refund(payment.razorpay_payment_id);
      refund = true;
    } else {
    }

    await payment.deleteOne();

    user.subscription.id = undefined;
    user.subscription.status = "Not active";

    const to = user.email;
    const subject = "SkillBoost";
    const text = `name:${user.name} \n email:${user.email} \n ${
      refund
        ? "subscription cancelled, amount will be refunded"
        : "subscription cancelled"
    }`;
    await sendEmail(to, subject, text);
    // req.subscription.status = "Not active";
    // console.log(req.subscription.status);
    await user.save();

    res.status(200).json({
      message: refund
        ? "subscription cancelled, amount will be refunded, check email"
        : "subscription cancelled, check email",
    });
  } catch (err) {
    res.status(500).json({ error: "something went wrong" });
  }
};

export default paymentCtrl;

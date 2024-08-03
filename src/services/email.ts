const nodemailer = require("nodemailer");
import { otpEmailContent } from "../util/emailLayout";
import dotenv from "dotenv";
dotenv.config();
class EmailService {
  sender = "jack.germanshepherd@gmail.com";
  receiver: string;
  otp: string;
  constructor(receiver: string, otp: string) {
    this.receiver = receiver;
    this.otp = otp;
  }

  sendEmail = async () => {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "jack.germanshepherd@gmail.com",
        pass: process.env.EMAIL_PASSWORD,
      },
    });
    await transporter.sendMail({
      from: "jack.germanshepherd@gmail.com",
      to: this.receiver,
      subject: "OTP",
      html: otpEmailContent(this.otp),
    });
    return true;
  };
}
export default EmailService;

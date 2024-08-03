import express, { Request, Response } from "express";
import { body } from "express-validator";
import PasswordService from "../services/password";
import { validateRequest } from "../middlewares/validationReq";
import Clients from "../models/clients";
import Organizers from "../models/organizers";
import { BadRequestError } from "../errors/bad-request-error";
import { dataBaseConnectionError } from "../util/dataBaseError";
import { RequestValidationError } from "../errors/validation-error";
import EmailService from "../services/email";
import { Op } from "sequelize";
import { userQueue } from "../services/queueService";
const router = express();
const validateReq = [
  body("username")
    .isLength({ min: 5, max: 20 })
    .withMessage("Username must be atleast 5 characters long"),
  body("email").isEmail().withMessage("Enter a valid email address"),
  body("email").normalizeEmail(),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long")
    .matches(/[A-Z]/)
    .withMessage("Password must contain at least one uppercase letter")
    .matches(/\d/)
    .withMessage("Password must contain at least one number")
    .matches(/[^A-Za-z0-9]/)
    .withMessage("Password must contain at least one special character"),
];

const generateNewOtp = async () => {
  const otp = Math.floor(
    Math.pow(10, 4 - 1) + Math.random() * 9 * Math.pow(10, 4 - 1)
  );

  const hashedOtp = await PasswordService.hashPassword(otp.toString());
  return { hashedOtp, otp };
};

const signUp = async (
  req: Request,
  res: Response,
  parameterArray: string[],
  type: string
) => {
  try {
    let errorMessage: string | null = null;
    let ModalType: any;
    if (type === "Clients") {
      ModalType = Clients;
    } else {
      ModalType = Organizers;
    }

    const requestValidationError = RequestValidationError.parametersErrors(
      parameterArray,
      req.body
    );

    if (requestValidationError) {
      return res.status(400).send({ message: "Invalid Parameters!" });
    }
    const modalParameter = await ModalType.findOne({
      where: { email: { [Op.eq]: req.body.email } },
    });
    if (modalParameter) {
      if (modalParameter.status === "pending") {
        const { hashedOtp, otp } = await generateNewOtp();
        await ModalType.update(
          {
            otp: hashedOtp,
          },
          {
            where: {
              email: req.body.email,
            },
          }
        );
        const sendEmail = new EmailService(req.body.email, otp.toString());
        await sendEmail.sendEmail();
        res.status(201).send({ message: "success" });
        userQueue.add(
          { email: req.body.email, type: req.body.type, otp: otp.toString() },
          { delay: 180000, attempts: 5 }
        );
        return;
      }
      errorMessage = `${
        type === "Clients" ? "Client" : "Organizer"
      } already exists!`;
      const badReq = new BadRequestError(errorMessage);
      return res.status(badReq.statusCode).send({ message: badReq.message });
    } else {
      const password: string = await PasswordService.hashPassword(
        req.body.password
      );
      const { hashedOtp, otp } = await generateNewOtp();
      if (type === "Organizers") {
        await ModalType.create({
          userName: req.body.username,
          password: password,
          email: req.body.email,
          imageUrl: "",
          otp: hashedOtp,
          status: "pending",
          contactNumber: req.body.contactNumber,
        });
      } else {
        await ModalType.create({
          userName: req.body.username,
          password: password,
          email: req.body.email,
          otp: hashedOtp,
          status: "pending",
        });
      }

      try {
        const sendEmail = new EmailService(req.body.email, otp.toString());
        await sendEmail.sendEmail();
        res.status(201).send({ message: "success" });
        userQueue.add(
          { email: req.body.email, type: req.body.type, otp: otp.toString() },
          { delay: 180000, attempts: 5 }
        );
      } catch (e) {
        console.log(e);
        return res.status(503).send({ message: "Please retry!" });
      }
    }
  } catch (e) {
    console.log(e);
    dataBaseConnectionError(res);
  }
};

const finalSignup = async (res: Response, req: Request, type: string) => {
  try {
    let ModalType: any;
    if (type === "clients") {
      ModalType = Clients;
    } else {
      ModalType = Organizers;
    }

    const modalParameter = await ModalType.findOne({
      where: { email: { [Op.eq]: req.body.email } },
    });

    if (modalParameter) {
      const isOtpTrue = await PasswordService.verifyPassword(
        req.body.otp,
        modalParameter.otp
      );

      if (isOtpTrue) {
        await ModalType.update(
          {
            status: "complete",
          },
          {
            where: {
              email: req.body.email,
            },
          }
        );
        return res.status(201).send({ message: "OTP successfully verified!" });
      } else {
        return res.status(401).send({ message: "Invalid OTP! Please Retry." });
      }
    }
  } catch (e) {
    dataBaseConnectionError(res);
  }
};

router.post(
  "/initiateSignup/client",
  validateReq,
  validateRequest,
  (req: Request, res: Response) => {
    console.log("here?");
    signUp(req, res, ["username", "type", "password", "email"], "Clients");
  }
);

router.post("/finalSignup/client", async (req: Request, res: Response) => {
  finalSignup(res, req, "clients");
});

router.post("/delete/client", async (req: Request, res: Response) => {
  try {
    await Clients.destroy({
      where: { email: { [Op.eq]: req.body.email } },
    });
    return res.status(201).send({ message: "Success" });
  } catch (e) {
    dataBaseConnectionError(res);
  }
});

router.post(
  "/initiateSignup/organizer",
  validateReq,
  validateRequest,
  (req: Request, res: Response) => {
    signUp(
      req,
      res,
      ["username", "password", "email", "contactNumber"],
      "Organizers"
    );
  }
);

router.post("/finalSignup/organizer", (req: Request, res: Response) => {
  finalSignup(res, req, "Organizers");
});

router.post("/delete/organizer", async (req: Request, res: Response) => {
  try {
    await Organizers.destroy({
      where: { email: { [Op.eq]: req.body.email } },
    });
    return res.status(201).send({ message: "Success" });
  } catch (e) {
    dataBaseConnectionError(res);
  }
});

router.post("/forgotPassword", async (req: Request, res: Response) => {
  try {
    const { hashedOtp, otp } = await generateNewOtp();
    if (req.body.type === "client") {
      const client = await Clients.findOne({
        where: { email: { [Op.eq]: req.body.email } },
      });
      if (!client) {
        return res.status(404).send({ message: "User Doesn't exist" });
      } else {
        await Clients.update(
          {
            otp: hashedOtp,
          },
          {
            where: {
              email: req.body.email,
            },
          }
        );
        const sendEmail = new EmailService(req.body.email, otp.toString());
        await sendEmail.sendEmail();

        res.status(200).send({ message: "Success" });
        userQueue.add(
          { email: req.body.email, type: req.body.type, otp: otp.toString() },
          { delay: 180000, attempts: 5 }
        );
        return;
      }
    } else {
      const organizer = await Organizers.findOne({
        where: { email: { [Op.eq]: req.body.email } },
      });
      if (!organizer) {
        return res.status(404).send({ message: "User Doesn't exist" });
      } else {
        await Organizers.update(
          {
            otp: hashedOtp,
          },
          {
            where: {
              email: { [Op.eq]: req.body.email },
            },
          }
        );
        const sendEmail = new EmailService(req.body.email, otp.toString());
        await sendEmail.sendEmail();

        res.status(200).send({ message: "Success" });
        userQueue.add(
          { email: req.body.email, type: req.body.type, otp: otp.toString() },
          { delay: 180000, attempts: 5 }
        );
        return;
      }
    }
  } catch (e) {
    console.log(e);
    dataBaseConnectionError(res);
  }
});

export { router as signUpRouter };

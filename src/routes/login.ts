import express, { Request, Response } from "express";
import Clients, { ClientAttrs } from "../models/clients";
import { RequestValidationError } from "../errors/validation-error";
import { dataBaseConnectionError } from "../util/dataBaseError";
import Organizers, { OrganizerAttrs } from "../models/organizers";
import dotenv from "dotenv";
import PasswordService from "../services/password";
import { verifyToken } from "../util/verifyToken";
import { userQueue } from "../services/queueService";
const router = express();
dotenv.config();
const jwt = require("jsonwebtoken");
export const generateTokens = (
  model: ClientAttrs | OrganizerAttrs,
  type: string
) => {
  const accessToken = jwt.sign(
    { email: model.email, id: model!.id, type: type },
    process.env.SECRET_KEY,
    { expiresIn: "60d" }
  );
  const refreshToken = jwt.sign(
    { email: model.email, id: model!.id, type: type },
    process.env.SECRET_KEY,
    { expiresIn: "60d" }
  );
  return { accessToken, refreshToken };
};

const verifyOtp = async (
  req: Request,
  type: string,
  res: Response,
  model: ClientAttrs | OrganizerAttrs
) => {
  try {
    if (!model?.otp) {
      return res
        .status(400)
        .json({ success: false, message: "Otp has been expired!" });
    }
    const isOtpTrue = await PasswordService.verifyPassword(
      req.body.otp,
      model.otp!
    );
    if (isOtpTrue) {
      const token = generateTokens(model, type);
      return res.status(200).json({
        message: "Successful",
        token,
        id: model.id,
        type,

        username: model.userName,
        email: model.email,
      });
    } else {
      return res.status(401).json({ message: "Invalid OTP!" });
    }
  } catch (e) {
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
};

const loginLogic = async (
  res: Response,
  model: ClientAttrs | OrganizerAttrs,
  type: string
) => {
  const token = generateTokens(model, type);
  return res.status(200).json({
    message: "Successful",
    token,
    id: model.id,
    username: model.userName,
    email: model.email,
    type,
  });
};

router.post("/login/client", async (req: Request, res: Response) => {
  try {
    const requestValidationError = RequestValidationError.parametersErrors(
      ["email", "password"],
      req.body
    );
    if (requestValidationError) {
      return res.status(400).send({ message: "Invalid Parameters!" });
    }
    const client = await Clients.findOne({
      where: { email: req.body.email },
      attributes: [
        "email",
        "id",
        "imageUuid",
        "username",
        "password",
        "status",
      ],
    });

    if (!client || client.status !== "complete") {
      return res.status(404).send({ message: "Client Doesn't exist" });
    }
    const verifyPassword = await PasswordService.verifyPassword(
      req.body.password,
      client.password
    );
    if (!verifyPassword) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    loginLogic(res, client!, "client");
  } catch (e) {
    dataBaseConnectionError(res);
  }
});
router.post("/login/organizer", async (req: Request, res: Response) => {
  try {
    const requestValidationError = RequestValidationError.parametersErrors(
      ["email", "password"],
      req.body
    );
    if (requestValidationError) {
      return res.status(400).send({ message: "Invalid Parameters!" });
    }
    const organizer = await Organizers.findOne({
      where: { email: req.body.email },
      attributes: ["email", "id", "username", "password"],
    });

    if (!organizer) {
      return res.status(404).send({ message: "Client Doesn't exist" });
    }
    const verifyPassword = await PasswordService.verifyPassword(
      req.body.password,
      organizer.password
    );
    if (!verifyPassword) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    loginLogic(res, organizer!, "organizer");
  } catch (e) {
    dataBaseConnectionError(res);
  }
});

router.post("/verifyOtp", async (req: Request, res: Response) => {
  try {
    if (req.body.type === "client") {
      const model = await Clients.findOne({
        where: { email: req.body.email },
        attributes: ["email", "id", "src", "username", "password", "otp"],
      });
      verifyOtp(req, req.body.type, res, model!);
    } else {
      const model = await Organizers.findOne({
        where: { email: req.body.email },
        attributes: ["email", "id", "src", "username", "password", "otp"],
      });
      verifyOtp(req, req.body.type, res, model!);
    }
  } catch (e) {
    console.log(e);
    dataBaseConnectionError(res);
  }
});
router.post("/refreshToken", async (req: Request, res: Response) => {
  try {
    const { refreshToken, id } = req.body;

    const isValidToken = verifyToken(refreshToken);

    if (isValidToken) {
      if (req.body.type === "client") {
        const client = await Clients.findOne({
          where: { id: id },
          attributes: ["email", "id", "userName"],
        });
        loginLogic(res, client!, "client");
      } else {
        const organizer = await Organizers.findOne({
          where: { id: id },
          attributes: ["email", "id", "userName"],
        });
        loginLogic(res, organizer!, "organizer");
      }
    } else {
      return res.status(401).json({ message: "Unauthorized" });
    }
  } catch (e) {
    console.log(e);
    dataBaseConnectionError(res);
  }
});
export { router as loginRouter };

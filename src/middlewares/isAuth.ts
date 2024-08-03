import { Request, Response, NextFunction } from "express";
import dotenv from "dotenv";
import Clients from "../models/clients";
import Organizers from "../models/organizers";
const jwt = require("jsonwebtoken");
export interface MyRequest extends Request {
  userId?: number;
  isValidUser?: boolean;
  type?: string;
}

export const isAuth = async (
  req: MyRequest,
  res: Response,
  next: NextFunction
) => {
  let auth = req.get("Authorization");
  const token = auth;
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.SECRET_KEY);
    let isValidUser: any = false;

    if (decoded) {
      const { id, type } = decoded;
      if (req?.isValidUser) {
        return next();
      }
      if (type === "client") {
        isValidUser = await Clients.findOne({ where: { id: id } });
      } else if (type === "organizer") {
        isValidUser = await Organizers.findOne({ where: { id: id } });
      } else {
        return res.status(401).send({ message: "Invalid token" });
      }
      if (isValidUser) {
        req.isValidUser = true;
        req.userId = id;
        req.type = type;
        next();
      } else {
        return res.status(401).send({ message: "Invalid token" });
      }
    }
  } catch (err) {
    console.log(err);
    return res.status(500).send({ message: err });
  }
};

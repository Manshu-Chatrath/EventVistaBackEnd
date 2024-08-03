import express, { Request, Response } from "express";
import Clients from "../models/clients";
import { dataBaseConnectionError } from "../util/dataBaseError";
import Organizers from "../models/organizers";
import PasswordService from "../services/password";
import { MyRequest, isAuth } from "../middlewares/isAuth";
const router = express();

const fetchUser = (
  res: Response,
  model: any,
  type: string,
  token = null,
  isAccount = false
) => {
  let obj: any;
  if (isAccount) {
    obj = {
      message: "Successful",
      id: model.id,
      username: model.userName,
      email: model.email,
      type,
      src: model.src,
    };
  } else {
    obj = {
      message: "Successful",
      token,
      id: model.id,
      username: model.userName,
      email: model.email,
      type,
    };
  }
  if (type === "organizer") {
    return res.status(200).json({ ...obj, contactNumber: model.contactNumber });
  }
  return res.status(200).json(obj);
};

router.post("/getUser", isAuth, async (req: Request, res: Response) => {
  try {
    const { type, token, id } = req.body;
    if (type === "client") {
      const client = await Clients.findOne({
        where: { id: id },
        attributes: ["email", "id", "userName"],
      });
      fetchUser(res, client!, "client", token);
    } else {
      const organizer = await Organizers.findOne({
        where: { id: id },
        attributes: ["email", "id", "userName"],
      });
      fetchUser(res, organizer!, "organizer", token);
    }
  } catch (e) {
    console.log(e);
    dataBaseConnectionError(res);
  }
});

router.get(
  "/account/getUser",
  isAuth,
  async (req: MyRequest, res: Response) => {
    try {
      const { type, userId } = req;
      if (type === "client") {
        const client = await Clients.findOne({
          where: { id: userId },
          attributes: ["email", "id", "src", "userName", "status"],
        });
        fetchUser(res, client!, "client", null, true);
      } else {
        const organizer = await Organizers.findOne({
          where: { id: userId },
          attributes: [
            "email",
            "id",
            "src",
            "userName",
            "status",
            "contactNumber",
          ],
        });
        fetchUser(res, organizer!, "organizer", null, true);
      }
    } catch (e) {
      console.log(e);
      dataBaseConnectionError(res);
    }
  }
);

router.patch("/editUser", isAuth, async (req: MyRequest, res: Response) => {
  try {
    const { contactNumber, password } = req.body;
    const { type, userId } = req;
    let updatedPassword = await PasswordService.hashPassword(password);
    if (type === "client") {
      await Clients.update(
        { password: updatedPassword },
        { where: { id: userId } }
      );
      res.status(200).send({ message: "Client updated successfully." });
    } else {
      await Organizers.update(
        { contactNumber, password: updatedPassword },
        { where: { id: userId } }
      );
      res.status(200).send({ message: "Organizer updated successfully." });
    }
  } catch (e) {
    console.log(e);
    dataBaseConnectionError(res);
  }
});
export { router as userRouter };

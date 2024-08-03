import { Op } from "sequelize";
import express, { Response } from "express";
import { dataBaseConnectionError } from "../util/dataBaseError";
import Organizers from "../models/organizers";
import { isAuth } from "../middlewares/isAuth";
import EventChatMessages from "../models/event_chat_messages";
import { MyRequest } from "../middlewares/isAuth";
import Clients from "../models/clients";
const router = express();
router.get(
  "/fetchMoreMessages",
  isAuth,
  async (req: MyRequest, res: Response) => {
    try {
      const index = Number(req.query.index) || 0;
      const count = Number(req.query.count) || 10;
      const eventChatId = Number(req.query.eventChatId) || 0;

      let eventChatMessages: any = await EventChatMessages.findAll({
        where: {
          eventChatId: {
            [Op.eq]: eventChatId,
          },
        },
        include: [
          { attributes: ["userName"], model: Organizers },
          {
            attributes: ["userName"],
            model: Clients,
          },
        ],
        order: [["createdAt", "DESC"]],
        offset: index,
        limit: count,
      });
      eventChatMessages = eventChatMessages.reverse();
      res.status(200).json({ messages: eventChatMessages });
    } catch (e) {
      console.log(e);
      dataBaseConnectionError(res);
    }
  }
);
export { router as eventChatRouter };

import { Op } from "sequelize";
import express, { Response } from "express";
import Events from "../models/events";
import { Sequelize } from "sequelize-typescript";
import { dataBaseConnectionError } from "../util/dataBaseError";
import Organizers from "../models/organizers";
import { isAuth } from "../middlewares/isAuth";
import { MyRequest } from "../middlewares/isAuth";
import Clients from "../models/clients";
import { eventQueue } from "../services/queueService";
const router = express();
const moment = require("moment");
router.post("/createEvent", isAuth, async (req: MyRequest, res: Response) => {
  try {
    const {
      title,
      latitude,
      longitude,
      startTime,
      endTime,
      location,
      eventDate,
      price = 0,
      timezone,
      about,
      tags,
      participantLimit,
    } = req.body;

    const event = await Events.create({
      organizerId: req.userId,
      title,
      startTime,
      endTime,
      cancel: false,
      timeZone: timezone,
      eventDate,
      location,
      latitude,
      longitude,
      price,
      about,
      participantLimit,
      tags: JSON.stringify(tags),
    });
    const twoDaysInMilliseconds = 2 * 24 * 60 * 60 * 1000;
    eventQueue.add(
      { id: event.id, type: "removeNotifications" },
      { delay: endTime - moment.utc().valueOf(), attempts: 5 }
    );
    eventQueue.add(
      { id: event.id, type: "removeEvents" },
      {
        delay: endTime - moment.utc().valueOf() + twoDaysInMilliseconds,
        attempts: 5,
      }
    );
    res.status(200).json({ eventId: event.dataValues.id });
  } catch (e) {
    console.log(e);
    dataBaseConnectionError(res);
  }
});
router.post("/cancelEvent", isAuth, async (req: MyRequest, res) => {
  try {
    const { id } = req.body;
    await Events.update(
      { cancel: true },
      {
        where: { id: id },
      }
    );
    return res.status(200).send({ message: "Event deleted successfully." });
  } catch (e) {
    console.log(e);
    dataBaseConnectionError(res);
  }
});

router.get("/getEvent/:id", isAuth, async (req: MyRequest, res) => {
  try {
    const { id } = req.params;
    const event: any = await Events.findOne({
      where: { id: id },
      include: [
        {
          model: Organizers,
          attributes: ["id", "userName", "src"],
        },

        {
          model: Clients,
          attributes: ["id", "userName", "src"],
        },
      ],
    });
    return res.status(200).send({ event: event });
  } catch (e) {
    console.log(e);
    dataBaseConnectionError(res);
  }
});

router.post("/cancelEvent/:id", isAuth, async (req: MyRequest, res) => {
  try {
    await Events.update({ cancel: true }, { where: { id: req.params.id } });
    return res.status(200).send({ success: true });
  } catch (e) {
    dataBaseConnectionError(res);
  }
});

router.get("/client/allEvents", isAuth, async (req: MyRequest, res) => {
  try {
    console.log("here");
    const index = Number(req.query.index) || 0;
    const count = Number(req.query.count) || 10;
    const search = req.query.search || "";
    const latitude = req.query.latitude || "";
    const longitude = req.query.longitude || "";
    const radiusInKm = 100;
    const distanceCondition = Sequelize.where(
      Sequelize.literal(
        `(6371 * acos(
          cos(radians(${latitude})) * 
          cos(radians(latitude)) * 
          cos(radians(longitude) - radians(${longitude})) + 
          sin(radians(${latitude})) * 
          sin(radians(latitude))
        ))`
      ),
      { [Op.lt]: radiusInKm }
    );

    const totalEvents: any = await Events.count({
      where: {
        [Op.and]: [
          {
            id: {
              [Op.notIn]: Sequelize.literal(
                `(SELECT eventId FROM clients_has_events WHERE clientId = ${req.userId})`
              ),
            },
            title: {
              [Op.like]: "%" + search + "%",
            },
            startTime: {
              [Op.gt]: moment.utc().valueOf(),
            },

            cancel: { [Op.not]: true },
          },
          distanceCondition,
        ],
      },
    });

    const events = await Events.findAll({
      where: {
        [Op.and]: [
          {
            id: {
              [Op.notIn]: Sequelize.literal(
                `(SELECT eventId FROM clients_has_events WHERE clientId = ${req.userId})`
              ),
            },
            title: {
              [Op.like]: "%" + search + "%",
            },
            cancel: { [Op.not]: true },
            startTime: {
              [Op.gt]: moment.utc().valueOf(),
            },
          },
          distanceCondition,
        ],
      },
      order: [["startTime", "ASC"]],
      offset: index,
      limit: count,
    });
    console.log("Here");
    return res.status(200).send({ events: events, totalLength: totalEvents });
  } catch (e) {
    console.log(e);
    dataBaseConnectionError(res);
  }
});

router.get(
  "/client/personalizedEvents",
  isAuth,
  async (req: MyRequest, res) => {
    try {
      const index = Number(req.query.index) || 0;
      const count = Number(req.query.count) || 10;
      const search = req.query.search || "";
      const filter = req.query.filter;
      let totalEvents = 0;
      let events: any[] = [];
      if (filter === "upcoming") {
        totalEvents = await Events.count({
          where: {
            [Op.and]: [
              {
                cancel: { [Op.not]: true },
                id: {
                  [Op.in]: Sequelize.literal(
                    `(SELECT eventId FROM clients_has_events WHERE clientId = ${req.userId})`
                  ),
                },
              },
              {
                title: {
                  [Op.like]: "%" + search + "%",
                },
              },
              {
                startTime: {
                  [Op.gt]: moment.utc().valueOf(),
                },
              },
            ],
          },
        });

        events = await Events.findAll({
          where: {
            [Op.and]: [
              { cancel: { [Op.not]: true } },
              {
                id: {
                  [Op.in]: Sequelize.literal(
                    `(SELECT eventId FROM clients_has_events WHERE clientId = ${req.userId})`
                  ),
                },
              },
              {
                title: {
                  [Op.like]: "%" + search + "%",
                },
              },
              {
                startTime: {
                  [Op.gt]: moment.utc().valueOf(),
                },
              },
            ],
          },
          order: [["startTime", "ASC"]],
          offset: index,
          limit: count,
        });
      } else if (filter === "past") {
        totalEvents = await Events.count({
          where: {
            [Op.and]: [
              { cancel: { [Op.not]: true } },
              {
                id: {
                  [Op.in]: Sequelize.literal(
                    `(SELECT eventId FROM clients_has_events WHERE clientId = ${req.userId})`
                  ),
                },
              },
              {
                endTime: {
                  [Op.lt]: moment.utc().valueOf(),
                },
              },
              {
                title: {
                  [Op.like]: "%" + search + "%",
                },
              },
            ],
          },
        });

        events = await Events.findAll({
          where: {
            [Op.and]: [
              { cancel: { [Op.not]: true } },
              {
                id: {
                  [Op.in]: Sequelize.literal(
                    `(SELECT eventId FROM clients_has_events WHERE clientId = ${req.userId})`
                  ),
                },
              },
              {
                endTime: {
                  [Op.lt]: moment.utc().valueOf(),
                },
              },
              {
                title: {
                  [Op.like]: "%" + search + "%",
                },
              },
            ],
          },
          order: [["startTime", "ASC"]],
          offset: index,
          limit: count,
        });
      } else if (filter === "ongoing") {
        totalEvents = await Events.count({
          where: {
            [Op.and]: [
              { cancel: { [Op.not]: true } },
              {
                id: {
                  [Op.in]: Sequelize.literal(
                    `(SELECT eventId FROM clients_has_events WHERE clientId = ${req.userId})`
                  ),
                },
              },
              {
                startTime: {
                  [Op.lte]: moment.utc().valueOf(),
                },
              },
              {
                endTime: {
                  [Op.gt]: moment.utc().valueOf(),
                },
              },
              {
                title: {
                  [Op.like]: "%" + search + "%",
                },
              },
            ],
          },
        });

        events = await Events.findAll({
          where: {
            [Op.and]: [
              { cancel: { [Op.not]: true } },
              {
                id: {
                  [Op.in]: Sequelize.literal(
                    `(SELECT eventId FROM clients_has_events WHERE clientId = ${req.userId})`
                  ),
                },
              },
              {
                startTime: {
                  [Op.lte]: moment.utc().valueOf(),
                },
              },
              {
                endTime: {
                  [Op.gt]: moment.utc().valueOf(),
                },
              },
              {
                title: {
                  [Op.like]: "%" + search + "%",
                },
              },
            ],
          },
          order: [["startTime", "ASC"]],
          offset: index,
          limit: count,
        });
      }
      return res.status(200).send({ events: events, totalLength: totalEvents });
    } catch (e) {
      console.log(e);
      dataBaseConnectionError(res);
    }
  }
);

router.get("/getOrganizersEvents", isAuth, async (req: MyRequest, res) => {
  try {
    const userId = req.userId;
    const index = Number(req.query.index) || 0;
    const count = Number(req.query.count) || 10;
    const search = req.query.search || "";
    const filter = req.query.filter;
    let totalEvents;
    let events;
    if (filter === "upcoming") {
      totalEvents = await Events.count({
        where: {
          [Op.and]: [
            { cancel: { [Op.not]: true } },
            {
              startTime: {
                [Op.gt]: moment.utc().valueOf(),
              },
            },
            {
              title: {
                [Op.like]: "%" + search + "%",
              },
            },
            { organizerId: userId },
          ],
        },
      });
      events = await Events.findAll({
        where: {
          [Op.and]: [
            { cancel: { [Op.not]: true } },
            {
              startTime: {
                [Op.gt]: moment.utc().valueOf(),
              },
            },
            {
              title: {
                [Op.like]: "%" + search + "%",
              },
            },
            { organizerId: userId },
          ],
        },
        order: [["startTime", "ASC"]],
        offset: index,
        limit: count,
      });
    } else if (filter === "past") {
      totalEvents = await Events.count({
        where: {
          [Op.and]: [
            { cancel: { [Op.not]: true } },
            {
              endTime: {
                [Op.lt]: moment.utc().valueOf(),
              },
            },
            {
              title: {
                [Op.like]: "%" + search + "%",
              },
            },
            { organizerId: userId },
          ],
        },
      });

      events = await Events.findAll({
        where: {
          [Op.and]: [
            { cancel: { [Op.not]: true } },
            {
              endTime: {
                [Op.lt]: moment.utc().valueOf(),
              },
            },
            {
              title: {
                [Op.like]: "%" + search + "%",
              },
            },
            { organizerId: userId },
          ],
        },
        order: [["startTime", "ASC"]],
        offset: index,
        limit: count,
      });
    } else if (filter === "ongoing") {
      totalEvents = await Events.count({
        where: {
          [Op.and]: [
            { cancel: { [Op.not]: true } },
            {
              startTime: {
                [Op.lte]: moment.utc().valueOf(),
              },
            },
            {
              endTime: {
                [Op.gt]: moment.utc().valueOf(),
              },
            },
            {
              title: {
                [Op.like]: "%" + search + "%",
              },
            },
            { organizerId: userId },
          ],
        },
      });

      events = await Events.findAll({
        where: {
          [Op.and]: [
            { cancel: { [Op.not]: true } },
            {
              startTime: {
                [Op.lte]: moment.utc().valueOf(),
              },
            },
            {
              endTime: {
                [Op.gt]: moment.utc().valueOf(),
              },
            },
            {
              title: {
                [Op.like]: "%" + search + "%",
              },
            },
            { organizerId: userId },
          ],
        },
        order: [["startTime", "ASC"]],
        offset: index,
        limit: count,
      });
    } else if (filter === "cancelled") {
      totalEvents = await Events.count({
        where: {
          [Op.and]: [
            { cancel: { [Op.eq]: true } },

            {
              title: {
                [Op.like]: "%" + search + "%",
              },
            },
            { organizerId: userId },
          ],
        },
      });

      events = await Events.findAll({
        where: {
          [Op.and]: [
            { cancel: { [Op.eq]: true } },

            {
              title: {
                [Op.like]: "%" + search + "%",
              },
            },
            { organizerId: userId },
          ],
        },
        order: [["startTime", "ASC"]],
        offset: index,
        limit: count,
      });
    }
    res.status(200).send({ events: events, totalLength: totalEvents });
  } catch (e) {
    console.log(e);
    dataBaseConnectionError(res);
  }
});
export { router as eventRouter };

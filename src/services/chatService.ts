import Events from "../models/events";
import EventChat from "../models/event_chat";
import EventChatMessages from "../models/event_chat_messages";
import Notifications from "../models/notification";
import Clients from "../models/clients";
import Organizers from "../models/organizers";
import { Op } from "sequelize";
import { Sequelize } from "sequelize-typescript";
import sequelize from "../database";
const moment = require("moment");
export class ChatService {
  public clients: any = {};
  public organizers: any = {};
  constructor(clients: any, organizers: any) {
    this.clients = clients;
    this.organizers = organizers;
  }

  async createEventGroupChat(
    eventId: number,
    eventTitle: string,
    userId: number,
    type: string
  ) {
    const transaction = await sequelize.transaction();
    try {
      const eventChat: any = await EventChat.create(
        {
          eventId,
        },
        { transaction }
      );
      const notification = await Notifications.create(
        {
          notificationType: "eventChat",
          notificationTypeId: eventChat.id,
          message: `Group chat for ${eventTitle} has been created!`,
          senderId: userId,
          senderType: type,
          receiverId: userId,
          receiverType: type,
          eventId,
        },
        { transaction }
      );
      await EventChatMessages.create(
        {
          eventChatId: eventChat.id,
          message: `Welcome to ${eventTitle} group chat!`,
        },
        { transaction }
      );
      this.organizers[userId].forEach((session: any) =>
        session.socket.send(
          JSON.stringify({
            notification: notification,
            requestType: "recentNotification",
          })
        )
      );

      await transaction.commit();
    } catch (e) {
      await transaction.rollback();
      console.log(e);
    }
  }
  async sendMessage(
    type: string,
    message: string,
    userId: number,
    eventGroupChatId: number,
    eventId: number
  ) {
    const transaction = await sequelize.transaction();
    try {
      let recentMessage: any =
        type === "organizer"
          ? await EventChatMessages.create(
              {
                eventChatId: eventGroupChatId,
                message: message,
                organizerId: userId,
              },
              { transaction }
            )
          : await EventChatMessages.create(
              {
                eventChatId: eventGroupChatId,
                message: message,
                clientId: userId,
              },
              { transaction }
            );
      const user =
        type === "organizer"
          ? await Organizers.findOne({
              attributes: ["userName"],
              where: { id: userId },
              transaction: transaction,
            })
          : await Clients.findOne({
              attributes: ["userName"],
              where: { id: userId },
              transaction: transaction,
            });

      await Events.update(
        { status: moment.utc().valueOf() },
        { where: { id: eventId }, transaction }
      );

      recentMessage = recentMessage.get({ plain: true });
      let recentMessageObject: any = {
        message: recentMessage.message,
        eventChatId: recentMessage.eventChatId,
        id: recentMessage.id,
        updatedAt: recentMessage.updatedAt,
        createdAt: recentMessage.createdAt,
      };
      if (type === "organizer") {
        recentMessageObject = {
          ...recentMessageObject,
          organizerId: userId,
          organizer: { userName: user!.userName },
        };
      } else {
        recentMessageObject = {
          ...recentMessageObject,
          clientId: userId,
          client: { userName: user!.userName },
        };
      }

      const allEventMembers: any = await Events.findOne({
        attributes: ["id", "title", "src", "updatedAt"],
        where: {
          id: eventId,
        },
        include: [
          {
            model: Clients,
            attributes: ["id", "userName"],
          },
          {
            model: Organizers,
            attributes: ["id", "userName"],
          },
          {
            model: EventChat,
            include: [
              {
                model: EventChatMessages,
                include: [
                  { attributes: ["id", "userName"], model: Organizers },
                  {
                    attributes: ["id", "userName"],
                    model: Clients,
                  },
                ],
                order: [["updatedAt", "DESC"]],
                limit: 20,
              },
            ],
          },
        ],
        transaction: transaction,
      });

      const members: any = allEventMembers.get({ plain: true });

      const clients = members.clients;
      const organizer = members.organizer;
      let eventChatMessages = members.eventChat.messages;
      delete members.clients;
      delete members.organizer;
      delete members.eventChat.messages;
      const event = members;

      eventChatMessages = eventChatMessages.reverse();

      const notifications = [];
      if (type === "client") {
        notifications.push({
          senderId: userId,
          senderType: type,
          notificationType: "eventChat",
          message: message,
          notificationTypeId: eventGroupChatId,
          eventId,
          receiverId: organizer.id,
          receiverType: "organizer",
        });
      }

      for (let i = 0; i < clients.length; i++) {
        if (clients[i].id !== userId) {
          notifications.push({
            senderId: userId,
            senderType: type,
            notificationType: "eventChat",
            message: message,
            notificationTypeId: eventGroupChatId,
            receiverId: clients[i].id,
            receiverType: "client",
            eventId,
          });
        }
      }

      const allNotifications: any = await Notifications.bulkCreate(
        notifications,
        { transaction }
      );

      const allRecentNotifications: any = allNotifications.map(
        (notification: any) => notification.get({ plain: true })
      );

      allRecentNotifications.map((notification: any) => {
        if (notification.receiverType === "organizer") {
          if (this.organizers?.[notification.receiverId]) {
            this.organizers[notification.receiverId].forEach((session: any) =>
              session.socket.send(
                JSON.stringify({
                  notification: notification,
                  requestType: "recentNotification",
                })
              )
            );
          }
        } else {
          if (this.clients?.[notification.receiverId]) {
            this.clients[notification.receiverId].forEach((session: any) =>
              session.socket.send(
                JSON.stringify({
                  notification: notification,
                  requestType: "recentNotification",
                })
              )
            );
          }
        }
      });

      for (let key in this.clients) {
        this.clients[key].forEach((session: any) =>
          session.socket.send(
            JSON.stringify({
              message: recentMessageObject,
              requestType: "recentMessage",
              eventChatId: eventGroupChatId,
              eventChatMessages,
              eventGroupChat: event,
            })
          )
        );
      }
      for (let key in this.organizers) {
        this.organizers[key].forEach((session: any) =>
          session.socket.send(
            JSON.stringify({
              message: recentMessageObject,
              requestType: "recentMessage",
              eventChatId: eventGroupChatId,
              eventChatMessages,
              eventGroupChat: event,
            })
          )
        );
      }
      await transaction.commit();
    } catch (e) {
      console.log(e);
      await transaction.rollback();
    }
  }
  async fetchOrganizerEventGroupChatList(
    userId: number,
    index: number,
    count: number,
    search: string
  ) {
    const totalGroupChats = await Events.count({
      attributes: ["id", "title", "src", "updatedAt"],
      where: {
        organizerId: userId,
        [Op.and]: [
          {
            title: {
              [Op.like]: "%" + search + "%",
            },
            cancel: { [Op.not]: true },
          },
          {
            endTime: {
              [Op.gt]: moment.utc().valueOf(),
            },
          },
        ],
      },
      include: {
        model: EventChat,
        include: [
          {
            model: EventChatMessages,
            include: [
              { attributes: ["userName"], model: Organizers },
              {
                attributes: ["userName"],
                model: Clients,
              },
            ],
            order: [["updatedAt", "DESC"]],
            limit: 20,
          },
        ],
      },
    });

    const eventGroupChats: any = await Events.findAll({
      attributes: ["id", "title", "src", "updatedAt"],
      where: {
        organizerId: userId,
        [Op.and]: [
          {
            endTime: {
              [Op.gt]: moment.utc().valueOf(),
            },

            title: {
              [Op.like]: "%" + search + "%",
            },
            cancel: { [Op.not]: true },
          },
        ],
      },
      include: {
        attributes: ["id"],
        model: EventChat,
      },
      order: [["updatedAt", "DESC"]],
      offset: index,
      limit: count,
    });

    let eventIds = eventGroupChats.map(
      (event: any) => event.get({ plain: true }).eventChat?.id
    );

    const promises = eventIds.map((eventChatId: number) =>
      EventChatMessages.findAll({
        where: { eventChatId: eventChatId },
        include: [
          { attributes: ["userName"], model: Organizers },
          { attributes: ["userName"], model: Clients },
        ],
        order: [["createdAt", "DESC"]],
        offset: 0,
        limit: 20,
      })
    );
    let eventChatMessages = await Promise.all(promises);

    eventChatMessages = eventChatMessages
      .reverse()
      .map((chat: any) => chat.reverse());
    eventChatMessages = eventChatMessages.flat();
    if (this.organizers?.[userId]) {
      this.organizers[userId].forEach((session: any) =>
        session.socket.send(
          JSON.stringify({
            requestType: "fetchEventGroupChatList",
            type: "success",
            totalLength: totalGroupChats,
            eventChatMessages,
            eventGroupChats,
          })
        )
      );
    }
  }

  async totalNumberOfMessages(eventChatId: number, userId: number) {
    const totalMessages = await EventChatMessages.count({
      where: {
        eventChatId: {
          [Op.eq]: eventChatId,
        },
      },
    });

    if (this?.clients[userId]) {
      this.clients[userId].forEach((session: any) =>
        session.socket.send(
          JSON.stringify({
            requestType: "totalNumberOfMessages",
            eventChatId,
            totalLength: totalMessages,
          })
        )
      );
    } else if (this?.organizers[userId]) {
      this.organizers[userId].forEach((session: any) =>
        session.socket.send(
          JSON.stringify({
            requestType: "totalNumberOfMessages",
            eventChatId,
            totalLength: totalMessages,
          })
        )
      );
    }
  }

  async fetchClientEventGroupChatList(
    userId: number,
    search: string,
    index: number,
    count: number
  ) {
    const totalGroupChats = await Events.count({
      attributes: ["id", "title", "src", "updatedAt"],
      where: {
        [Op.and]: [
          {
            id: {
              [Op.in]: Sequelize.literal(
                `(SELECT eventId FROM clients_has_events WHERE clientId = ${userId})`
              ),
            },
            title: {
              [Op.like]: "%" + search + "%",
            },
            endTime: {
              [Op.gt]: moment.utc().valueOf(),
            },

            cancel: { [Op.not]: true },
          },
        ],
      },
      include: {
        model: EventChat,
      },
    });

    const eventGroupChats: any = await Events.findAll({
      attributes: ["id", "title", "src", "updatedAt"],
      where: {
        [Op.and]: [
          {
            id: {
              [Op.in]: Sequelize.literal(
                `(SELECT eventId FROM clients_has_events WHERE clientId = ${userId})`
              ),
            },
            title: {
              [Op.like]: "%" + search + "%",
            },
            endTime: {
              [Op.gt]: moment.utc().valueOf(),
            },

            cancel: { [Op.not]: true },
          },
        ],
      },
      include: {
        attributes: ["id"],
        model: EventChat,
      },
      order: [["updatedAt", "DESC"]],
      offset: index,
      limit: count,
    });
    let eventIds = eventGroupChats.map(
      (event: any) => event.get({ plain: true }).eventChat
    );
    eventIds = eventIds.map((event: any) => event.id);

    const promises = eventIds.map((eventChatId: number) =>
      EventChatMessages.findAll({
        where: { eventChatId: eventChatId },
        include: [
          { attributes: ["userName"], model: Organizers },
          { attributes: ["userName"], model: Clients },
        ],
        order: [["createdAt", "DESC"]],
        offset: 0,
        limit: 20,
      })
    );
    let eventChatMessages = await Promise.all(promises);
    eventChatMessages = eventChatMessages
      .reverse()
      .map((chat: any) => chat.reverse());
    eventChatMessages = eventChatMessages.flat();

    if (this.clients?.[userId]) {
      this.clients[userId].forEach((session: any) =>
        session.socket.send(
          JSON.stringify({
            requestType: "fetchEventGroupChatList",
            type: "success",
            totalLength: totalGroupChats,
            eventChatMessages,
            eventGroupChats,
          })
        )
      );
    }
  }
}

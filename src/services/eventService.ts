import Events from "../models/events";
import Clients_has_Events from "../models/clients_has_events";
import EventChat from "../models/event_chat";
import EventChatMessages from "../models/event_chat_messages";
import { notificationQueue, eventQueue } from "./queueService";
import Notifications from "../models/notification";
import Clients from "../models/clients";
import Organizers from "../models/organizers";
import { Op } from "sequelize";
import sequelize from "../database";

export class EventService {
  public clients: any = {};
  public organizers: any = {};
  constructor(clients: any, organizers: any) {
    this.clients = clients;
    this.organizers = organizers;
  }

  setNotificationRemoval(notificationIds: number[]) {
    notificationQueue.add(
      { notificationIds: notificationIds },
      { delay: 2 * 24 * 60 * 60 * 1000, attempts: 5 }
    );
  }

  async joinEvent(type: string, userId: number, eventId: number) {
    {
      const notificationIds: number[] = [];
      const transaction = await sequelize.transaction();
      try {
        const clientExist = await Clients_has_Events.findOne({
          where: {
            [Op.and]: [
              {
                eventId: { [Op.eq]: eventId },
                clientId: { [Op.eq]: userId },
              },
            ],
          },
        });
        if (clientExist) {
          return;
        } else {
          const event: any = await Events.findOne({
            attributes: ["id", "title", "src", "participantLimit"],
            where: {
              id: eventId,
            },
            include: [
              {
                model: EventChat,
              },
              {
                model: Clients,
                attributes: ["id", "userName"],
              },
              {
                model: Organizers,
                attributes: ["id", "userName"],
              },
            ],
            transaction: transaction,
          });

          const clients = event.clients;
          const organizer = event.organizer;
          const eventChat = event.eventChat;
          delete event.clients;
          delete event.eventChat;
          delete event.organizer;

          if (clients?.length < event.participantLimit) {
            await Clients_has_Events.create(
              {
                isNotGoing: false,
                isRemoved: false,
                isPaid: false,
                eventId: eventId,
                clientId: userId,
              },
              { transaction }
            );
            const client = await Clients.findOne({
              attributes: ["id", "userName", "src"],
              where: { id: userId },
              transaction: transaction,
            });

            await EventChatMessages.create(
              {
                eventChatId: eventChat.id,
                message: `${client!.userName} has joined the chat!`,
                clientId: userId,
              },
              { transaction }
            );
            const notifications = [];
            notifications.push(
              {
                senderId: userId,
                senderType: type,
                notificationType: "eventChat",
                message: `${client!.userName} has joined the chat!`,
                notificationTypeId: eventChat.id,
                receiverId: organizer.id,
                receiverType: "organizer",
                eventId,
              },
              {
                senderId: userId,
                senderType: type,
                notificationType: "event",
                message: `${client!.userName} has joined the event!`,
                notificationTypeId: eventId,
                receiverId: organizer.id,
                receiverType: "organizer",
                eventId,
              }
            );

            for (let i = 0; i < clients.length; i++) {
              if (clients[i].id !== userId) {
                notifications.push(
                  {
                    senderId: userId,
                    eventId,
                    senderType: type,
                    notificationType: "eventChat",
                    message: `${client!.userName} has joined the chat!`,
                    notificationTypeId: eventChat.id,
                    receiverId: clients[i].id,
                    receiverType: "client",
                  },
                  {
                    senderId: userId,
                    senderType: type,
                    notificationType: "event",
                    message: `${client!.userName} has joined the event!`,
                    notificationTypeId: eventId,
                    receiverId: clients[i].id,
                    receiverType: "client",
                    eventId,
                  }
                );
              }
            }
            notifications.push(
              {
                senderId: userId,
                senderType: type,
                notificationType: "eventChat",
                message: `${client!.userName} has joined the chat!`,
                notificationTypeId: eventChat.id,
                eventId,
                receiverId: userId,
                receiverType: "client",
              },
              {
                senderId: userId,
                senderType: type,
                notificationType: "event",
                message: `You have joined the event!`,
                notificationTypeId: eventId,
                receiverId: userId,
                receiverType: "client",
                eventId,
              }
            );
            const allNotifications: any = await Notifications.bulkCreate(
              notifications,
              { transaction }
            );

            const allRecentNotifications: any = allNotifications.map(
              (notification: any) => notification.get({ plain: true })
            );

            allRecentNotifications.map((notification: any) => {
              if (notification.notificationType === "event") {
                notificationIds.push(notification.id);
              }
              if (notification.receiverType === "organizer") {
                if (this.organizers?.[notification.receiverId]) {
                  this.organizers[notification.receiverId].forEach(
                    (session: any) =>
                      session.socket.send(
                        JSON.stringify({
                          notification: notification,
                          event: event,
                          requestType: "recentNotification",
                        })
                      )
                  );
                }
              } else {
                if (this.clients?.[notification.receiverId]) {
                  this.clients[notification.receiverId].forEach(
                    (session: any) =>
                      session.socket.send(
                        JSON.stringify({
                          notification: notification,
                          event: event,
                          requestType: "recentNotification",
                          requestMessage: "joinedEvent",
                        })
                      )
                  );
                }
              }
            });
          } else {
            const notification = await Notifications.create({
              senderId: userId,
              senderType: type,
              notificationType: "event",
              message: `Unfortunately, the event is full!`,
              notificationTypeId: eventId,
              receiverId: userId,
              receiverType: "client",
              eventId,
            });
            this.clients[userId].forEach((session: any) =>
              session.socket.send(
                JSON.stringify({
                  notification: notification,
                  event: event,
                  requestType: "recentNotification",
                  requestMessage: "joinedEvent",
                })
              )
            );
          }
          this.setNotificationRemoval(notificationIds);
          await transaction.commit();
        }
      } catch (e) {
        console.log(e);
        await transaction.rollback();
      }
    }
  }

  async cancelComingToEvent(type: string, userId: number, eventId: number) {
    {
      const transaction = await sequelize.transaction();
      try {
        await Clients_has_Events.destroy({
          where: {
            [Op.and]: [
              {
                eventId: { [Op.eq]: eventId },
                clientId: { [Op.eq]: userId },
              },
            ],
          },
          transaction,
        });

        const client = await Clients.findOne({
          where: { id: userId },
          transaction: transaction,
        });

        const event: any = await Events.findOne({
          attributes: ["id", "title", "src", "participantLimit"],
          where: {
            id: eventId,
          },
          include: [
            {
              model: EventChat,
            },
            {
              model: Clients,
              attributes: ["id", "userName"],
            },
            {
              model: Organizers,
              attributes: ["id", "userName"],
            },
          ],
          transaction: transaction,
        });

        const clients = event.clients;
        const organizer = event.organizer;

        delete event.clients;
        delete event.eventChat;
        delete event.organizer;

        const notifications = [];
        await Notifications.destroy({
          where: { eventId: eventId, receiverId: userId },
          transaction,
        });
        notifications.push({
          senderId: userId,
          senderType: type,
          notificationType: "event",
          message: `${client!.userName} has left the event!`,
          notificationTypeId: eventId,
          eventId,
          receiverId: organizer.id,
          receiverType: "organizer",
        });

        notifications.push({
          senderId: userId,
          senderType: type,
          notificationType: "event",
          message: `You have left the event!`,
          notificationTypeId: eventId,
          eventId,
          receiverId: userId,
          receiverType: "client",
        });

        for (let i = 0; i < clients.length; i++) {
          notifications.push({
            senderId: userId,
            senderType: type,
            notificationType: "event",
            message: `${client!.userName} has left the event!`,
            notificationTypeId: eventId,
            receiverId: clients[i].id,
            eventId,
            receiverType: "client",
          });
        }
        const allNotifications: any = await Notifications.bulkCreate(
          notifications,
          { transaction }
        );

        const allRecentNotifications: any = allNotifications.map(
          (notification: any) => notification.get({ plain: true })
        );
        const notificationIds: number[] = [];
        allRecentNotifications.map((notification: any) => {
          if (notification.notificationType === "event") {
            notificationIds.push(notification.id);
          }
          if (notification.receiverType === "organizer") {
            if (this.organizers?.[notification.receiverId]) {
              this.organizers[notification.receiverId].forEach((session: any) =>
                session.socket.send(
                  JSON.stringify({
                    notification: notification,
                    event: event,
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
                    event: event,
                    requestType: "recentNotification",
                    requestMessage: "leftEvent",
                  })
                )
              );
            }
          }
        });
        if (this.clients?.[userId]) {
          this.clients[userId].forEach((session: any) =>
            session.socket.send(
              JSON.stringify({
                type: "success",
                requestType: "cancelComingToEvent",
              })
            )
          );
        }
        this.setNotificationRemoval(notificationIds);
        await transaction.commit();
      } catch (e) {
        console.log(e);
        await transaction.rollback();
      }
    }
  }

  async removeMember(
    userId: number,
    memberId: number,
    eventId: number,
    type: string
  ) {
    const transaction = await sequelize.transaction();
    try {
      await Clients_has_Events.destroy({
        where: {
          [Op.and]: [
            {
              eventId: { [Op.eq]: eventId },
              clientId: { [Op.eq]: memberId },
            },
          ],
        },
        transaction,
      });

      const client = await Clients.findOne({
        where: { id: memberId },
        transaction: transaction,
      });

      const event: any = await Events.findOne({
        attributes: ["id", "title", "src"],
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
          },
        ],
        transaction: transaction,
      });

      const clients = event.clients;
      delete event.clients;
      delete event.organizers;
      const notifications = [];
      notifications.push({
        senderId: userId,
        senderType: "organizer",
        notificationType: "event",
        message: `${client!.userName} has been removed from the event!`,
        notificationTypeId: eventId,
        receiverId: userId,
        eventId,
        receiverType: "organizer",
      });

      for (let i = 0; i < clients.length; i++) {
        notifications.push({
          senderId: userId,
          senderType: "organizer",
          eventId,
          notificationType: "event",
          message: `${client!.userName} has been removed from the event!`,
          notificationTypeId: eventId,
          receiverId: clients[i].id,
          receiverType: "client",
        });
      }
      const allNotifications: any = await Notifications.bulkCreate(
        notifications,
        { transaction }
      );
      await Notifications.destroy({
        where: {
          [Op.and]: [
            {
              notificationTypeId: { [Op.eq]: event?.eventChat.id },
              receiverId: { [Op.eq]: memberId },
              notificationType: "eventChat",
            },
          ],
        },
        transaction,
      });
      const notificationIds: number[] = [];
      allNotifications.map((notification: any) => {
        if (notification.notificationType === "event") {
          notificationIds.push(notification.id);
        }
        if (notification.receiverType === "organizer") {
          if (this.organizers?.[notification.receiverId]) {
            this.organizers[notification.receiverId].forEach((session: any) =>
              session.socket.send(
                JSON.stringify({
                  notification: notification,
                  event: event,
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
                  event: event,
                  requestType: "recentNotification",
                  requestMessage: "leftEvent",
                })
              )
            );
          }
        }
      });
      const userNotification = await Notifications.create(
        {
          senderId: userId,
          senderType: type,
          eventId,
          notificationType: "event",
          message: `You have been removed from the event!`,
          notificationTypeId: eventId,
          receiverId: memberId,
          receiverType: "client",
        },
        { transaction }
      );
      if (this.clients?.[memberId]) {
        this.clients[memberId].forEach((session: any) =>
          session.socket.send(
            JSON.stringify({
              notification: userNotification,
              event: event,
              requestType: "recentNotification",
            })
          )
        );
      }
      this.setNotificationRemoval(notificationIds);
      await transaction.commit();
    } catch (e) {
      console.log(e);
      await transaction.rollback();
    }
  }

  async cancelEvent(userId: number, eventId: number) {
    const transaction = await sequelize.transaction();
    try {
      await Events.update(
        {
          cancel: true,
        },

        {
          where: {
            id: eventId,
          },
          transaction,
        }
      );
      const event: any = await Events.findOne({
        attributes: ["id", "title", "src"],
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
          },
        ],
        transaction: transaction,
      });
      await EventChat.destroy({
        where: { eventId: eventId },
        transaction,
      });

      await Clients_has_Events.destroy({
        where: {
          eventId: { [Op.eq]: eventId },
        },
        transaction,
      });

      const clients = event.clients;
      delete event.clients;
      delete event.organizers;
      const notifications = [];
      notifications.push({
        senderId: userId,
        senderType: "organizer",
        notificationType: "event",
        message: `The event ${event.title} has been cancelled!`,
        notificationTypeId: eventId,
        receiverId: userId,
        eventId,
        receiverType: "organizer",
      });

      for (let i = 0; i < clients.length; i++) {
        notifications.push({
          senderId: userId,
          senderType: "organizer",
          notificationType: "event",
          message: `The event ${event.title} has been cancelled!`,
          notificationTypeId: eventId,
          receiverId: clients[i].id,
          eventId,
          receiverType: "client",
        });
      }
      const allNotifications: any = await Notifications.bulkCreate(
        notifications,
        { transaction }
      );
      await Notifications.destroy({
        where: {
          [Op.and]: [
            {
              notificationTypeId: { [Op.eq]: event?.eventChat.id },
              notificationType: "eventChat",
            },
          ],
        },
        transaction,
      });
      const notificationIds: number[] = [];
      allNotifications.map((notification: any) => {
        if (notification.notificationType === "event") {
          notificationIds.push(notification.id);
        }
        if (notification.receiverType === "organizer") {
          if (this.organizers?.[notification.receiverId]) {
            this.organizers[notification.receiverId].forEach((session: any) =>
              session.socket.send(
                JSON.stringify({
                  notification: notification,
                  event: event,
                  requestType: "recentNotification",
                  requestMessage: "cancelEvent",
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
                  event: event,
                  requestType: "recentNotification",
                  requestMessage: "leftEvent",
                })
              )
            );
          }
        }
      });
      this.setNotificationRemoval(notificationIds);
      await transaction.commit();
      eventQueue.add(
        { id: eventId, type: "cancelEvent", eventChatId: event.eventChat.id },
        { delay: 2 * 24 * 60 * 60 * 1000, attempts: 5 }
      );
    } catch (e) {
      console.log(e);
      await transaction.rollback();
    }
  }
}

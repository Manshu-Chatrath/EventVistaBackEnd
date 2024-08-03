import Events from "../models/events";
import Notifications from "../models/notification";
import { Op } from "sequelize";

export class NotificationService {
  public clients: any = {};
  public organizers: any = {};
  constructor(clients: any, organizers: any) {
    this.clients = clients;
    this.organizers = organizers;
  }
  async getAllNotifications(userId: number, type: string) {
    try {
      const notifications = await Notifications.findAll({
        where: {
          [Op.and]: [
            {
              receiverId: { [Op.eq]: userId },
              receiverType: { [Op.eq]: type },
            },
          ],
        },
        order: [["createdAt", "DESC"]],
      });
      const eventNotifications = notifications.filter(
        (notification) => notification.notificationType === "event"
      );
      const notificationIds: any = [];

      eventNotifications.map((notification) =>
        notificationIds.push(notification.notificationTypeId)
      );

      const events = await Events.findAll({
        attributes: ["id", "title", "src"],
        where: {
          id: {
            [Op.in]: notificationIds,
          },
        },
      });

      if (type === "organizer") {
        if (this.organizers?.[userId]) {
          this.organizers[userId].forEach((session: any) => {
            session.socket.send(
              JSON.stringify({
                notifications: notifications,
                events,
                requestType: "getAllNotifications",
              })
            );
          });
        }
      } else {
        if (this.clients?.[userId]) {
          this.clients[userId].forEach((session: any) => {
            session.socket.send(
              JSON.stringify({
                notifications: notifications,
                events: events.map((e) => e.get({ plain: true })),
                requestType: "getAllNotifications",
              })
            );
          });
        }
      }
    } catch (e) {
      console.log("So error is ", e);
    }
  }

  async removeNotification(
    userId: number,
    type: string,
    notificationType: string,
    notificationTypeId: number,
    notificationId: number
  ) {
    try {
      if (notificationType === "eventChat") {
        await Notifications.destroy({
          where: {
            [Op.and]: [
              {
                receiverId: { [Op.eq]: userId },
                receiverType: { [Op.eq]: type },
                notificationType: { [Op.eq]: notificationType },
                notificationTypeId: { [Op.eq]: notificationTypeId },
              },
            ],
          },
        });
      } else {
        await Notifications.destroy({
          where: { id: notificationId },
        });
      }
      await this.getAllNotifications(userId, type);
    } catch (e) {
      console.log(e);
    }
  }
}

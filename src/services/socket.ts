import { EventService } from "./eventService";
import { NotificationService } from "./notificationService";
import { ChatService } from "./chatService";
import dotenv from "dotenv";
dotenv.config();
const jwt = require("jsonwebtoken");
export class Websocket {
  public websocket: any;
  public socket: any;
  public id: string;
  public clients: any = {};
  public organizers: any = {};

  constructor(websocket: any, id: string) {
    this.websocket = websocket;
    this.id = id;
  }

  initialize() {
    this.websocket.on("connection", (ws: any, req: Request) => {
      this.socket = ws;

      const token = new URL(req.url, "http://localhost").searchParams.get(
        "token"
      );

      if (!token) {
        ws.close(1008, "Token is required");
        return;
      }

      const userId = new URL(req.url, "http://localhost").searchParams.get(
        "userId"
      );
      const type = new URL(req.url, "http://localhost").searchParams.get(
        "type"
      );
      jwt.verify(token, process.env.SECRET_KEY, (err: any, decoded: any) => {
        if (err) {
          ws.close(1008, "Token is invalid");
          return;
        }
        if (type === "organizer") {
          if (!this.organizers?.[userId!]) {
            this.organizers[userId!] = [];
          }
          this.organizers[userId!].push({ id: this.id, socket: ws });
        } else {
          if (!this.clients?.[userId!]) {
            this.clients[userId!] = [];
          }
          this.clients[userId!].push({ id: this.id, socket: ws });
        }
        const eventService = new EventService(this.clients, this.organizers);
        const notificationService = new NotificationService(
          this.clients,
          this.organizers
        );
        const chatService = new ChatService(this.clients, this.organizers);
        ws.on("close", () => {
          if (type === "organizer") {
            this.organizers[userId!] = this.organizers[userId!].filter(
              (session: any) => session.id !== this.id
            );
          } else {
            this.clients[userId!] = this.clients[userId!].filter(
              (session: any) => session.id !== this.id
            );
          }
        });

        ws.on("error", (e: any) => {
          if (type === "organizer") {
            this.organizers[userId!] = this.organizers[userId!].filter(
              (session: any) => session.id !== this.id
            );
          } else {
            this.clients[userId!] = this.clients[userId!].filter(
              (session: any) => session.id !== this.id
            );
          }
        });

        ws.on("message", async (o: any) => {
          const {
            type = null,
            userId = null,
            memberId = null,
            messageType = null,
            notificationId = null,
            notificationType = null,
            notificationTypeId = null,
            eventGroupChatId,
            search = "",
            index = 0,
            eventTitle = "",
            count = 10,
            eventId = null,
            message = null,
          } = JSON.parse(o.toString());

          switch (messageType) {
            case "message":
              chatService.sendMessage(
                type,
                message,
                userId,
                eventGroupChatId,
                eventId
              );
              break;

            case "joinEvent":
              eventService.joinEvent(type, userId, eventId);
              break;

            case "cancelComingToEvent":
              eventService.cancelComingToEvent(type, userId, eventId);
              break;

            case "createEventGroupChat":
              chatService.createEventGroupChat(
                eventId,
                eventTitle,
                userId,
                type
              );
              break;

            case "removeNotification":
              notificationService.removeNotification(
                userId,
                type,
                notificationType,
                notificationTypeId,
                notificationId
              );
              break;

            case "getAllNotifications":
              notificationService.getAllNotifications(userId, type);
              break;

            case "fetchEventGroupChatList":
              if (type === "organizer") {
                chatService.fetchOrganizerEventGroupChatList(
                  userId,
                  index,
                  count,
                  search
                );
              } else {
                chatService.fetchClientEventGroupChatList(
                  userId,
                  search,
                  index,
                  count
                );
              }
              break;
            case "removeMember":
              eventService.removeMember(userId, memberId, eventId, type);
              break;
            case "cancelEvent":
              eventService.cancelEvent(userId, eventId);
              break;
            case "totalNumberOfMessages":
              chatService.totalNumberOfMessages(eventGroupChatId, userId);
              break;
            default:
              break;
          }
        });
      });
    });
  }
}

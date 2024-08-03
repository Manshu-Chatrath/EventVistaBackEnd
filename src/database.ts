import { Sequelize } from "sequelize-typescript";
import Clients from "./models/clients";
import Organizers from "./models/organizers";
import Events from "./models/events";
import Clients_has_Events from "./models/clients_has_events";
import EventChat from "./models/event_chat";
import EventChatMessages from "./models/event_chat_messages";
import Notifications from "./models/notification";
import dotenv from "dotenv";
dotenv.config();
const sequelize = new Sequelize({
  dialect: "mysql",
  host: process.env.MYSQL_HOST,
  timezone: "+00:00",
  username: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  models: [
    Clients,
    Organizers,
    Events,
    Clients_has_Events,
    EventChat,
    Notifications,
    EventChatMessages,
  ],
});

export default sequelize;

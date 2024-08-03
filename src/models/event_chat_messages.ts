import {
  Table,
  Column,
  Model,
  BelongsTo,
  DataType,
  AllowNull,
  ForeignKey,
} from "sequelize-typescript";
import Organizers from "./organizers";
import Clients from "./clients";
import EventChat from "./event_chat";
export interface EventChatMessagesAttrs {
  id?: number;
  eventChatId: number;
  message: string;
  clientId?: number;
  organizerId?: number;
}

// Define the Event_Chat model
@Table({
  tableName: "event_chat_messages", // Set the table name
  timestamps: true, // Add timestamps (createdAt, updatedAt)
})
class EventChatMessages extends Model<EventChatMessagesAttrs> {
  @Column({
    type: DataType.INTEGER,
    autoIncrement: true,
    primaryKey: true,
    allowNull: false,
  })
  id?: number;

  @ForeignKey(() => EventChat)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  eventChatId: number;

  @ForeignKey(() => Organizers)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  organizerId: number;

  @ForeignKey(() => Clients)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  clientId: number;

  @BelongsTo(() => EventChat, {
    onDelete: "CASCADE",
  })
  eventChat: EventChat;

  @BelongsTo(() => Organizers, {
    onDelete: "CASCADE",
  })
  organizer: Organizers;

  @BelongsTo(() => Clients, {
    onDelete: "CASCADE",
  })
  client: Clients;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  message: string;
}
export default EventChatMessages;

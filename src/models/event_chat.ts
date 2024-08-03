import {
  Table,
  Column,
  Model,
  BelongsTo,
  DataType,
  AllowNull,
  ForeignKey,
  HasMany,
} from "sequelize-typescript";
import Events from "./events";
import EventChatMessages from "./event_chat_messages";
export interface EventChatAttrs {
  id?: number;
  eventId: number;
}

// Define the Event_Chat model
@Table({
  tableName: "event_chat", // Set the table name
  timestamps: true, // Add timestamps (createdAt, updatedAt)
})
class EventChat extends Model<EventChatAttrs> {
  @Column({
    type: DataType.INTEGER,
    autoIncrement: true,
    primaryKey: true,
    allowNull: false,
  })
  id?: number;

  @ForeignKey(() => Events)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    unique: true, // Ensure eventId is unique to establish one-to-one relationship
  })
  eventId: number;

  @BelongsTo(() => Events, {
    onDelete: "CASCADE",
    foreignKey: "eventId",
    as: "Events", // Define the association with Events model
  })
  event: Events;

  @HasMany(() => EventChatMessages)
  messages: EventChatMessages[];
}
export default EventChat;

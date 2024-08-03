import {
  Table,
  Column,
  Model,
  BelongsTo,
  BelongsToMany,
  HasOne,
  DataType,
  AllowNull,
  ForeignKey,
} from "sequelize-typescript";
import Organizers from "./organizers";
import EventChat from "./event_chat";
import Clients_has_Events from "./clients_has_events";
import Clients from "./clients";
export interface EventAttrs {
  id?: number;
  startTime: number;
  organizerId?: number;
  endTime: number;
  location: string;
  about: string;
  price: number;
  participantLimit: number;
  title: string;
  imageUuid?: string;
  latitude: number;
  longitude: number;
  timeZone: string;
  tags: string;
  cancel?: boolean;
  status?: number;
  eventDate: number;
  updatedAt?: string;
  src?: string;
}

// Define the Client model
@Table({
  tableName: "events", // Set the table name
  timestamps: true, // Add timestamps (createdAt, updatedAt)
})
class Events extends Model<EventAttrs> {
  @Column({
    type: DataType.INTEGER,
    autoIncrement: true,
    primaryKey: true,
    allowNull: false,
  })
  id?: number;

  @ForeignKey(() => Organizers)
  @Column({
    type: DataType.INTEGER,
  })
  organizerId: number;

  @BelongsTo(() => Organizers, {
    onDelete: "CASCADE", // This will delete the event when the associated organizer is deleted
  })
  organizer: Organizers;

  @AllowNull(false)
  @Column({
    type: DataType.STRING,
  })
  title: string;

  @BelongsToMany(() => Clients, {
    through: { model: () => Clients_has_Events },
    onDelete: "CASCADE",
  })
  clients: Clients[];

  @AllowNull(true)
  @Column({
    type: DataType.BOOLEAN,
  })
  cancel: boolean;

  @AllowNull(true)
  @Column({
    type: DataType.FLOAT,
  })
  latitude: number;

  @AllowNull(true)
  @Column({
    type: DataType.FLOAT,
  })
  longitude: number;

  @AllowNull(false)
  @Column({
    type: DataType.STRING,
  })
  tags: string;

  @AllowNull(false)
  @Column({
    type: DataType.STRING,
  })
  timeZone: string;

  @AllowNull(true)
  @Column({
    type: DataType.STRING,
  })
  imageUuid: string;

  @AllowNull(true)
  @Column({
    type: DataType.STRING,
  })
  src: string;

  @AllowNull(false)
  @Column({
    type: DataType.INTEGER,
  })
  participantLimit: number;

  @AllowNull(true)
  @Column({
    type: DataType.BIGINT,
  })
  status: number;

  @AllowNull(false)
  @Column({
    type: DataType.BIGINT,
  })
  startTime: number;

  @AllowNull(false)
  @Column({
    type: DataType.BIGINT,
  })
  endTime: number;

  @AllowNull(false)
  @Column({
    type: DataType.BIGINT,
  })
  eventDate: number;

  @AllowNull(false)
  @Column({
    type: DataType.TEXT,
  })
  about: string;

  @AllowNull(false)
  @Column({
    type: DataType.STRING,
  })
  location: string;

  @AllowNull(false)
  @Column({
    type: DataType.DECIMAL,
  })
  price: number;

  @HasOne(() => EventChat)
  eventChat: EventChat;
}
export default Events;

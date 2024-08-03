import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  AllowNull,
  Default,
} from "sequelize-typescript";
import Events from "./events";
import Clients from "./clients";
export interface Client_has_EventsAttrs {
  clientId: number;
  eventId: number;
  isPaid: boolean;
  isNotGoing: boolean;
  isRemoved: boolean;
}

// Define the Client model
@Table({
  tableName: "clients_has_events", // Set the table name
  timestamps: true, // Add timestamps (createdAt, updatedAt)
})
class Clients_has_Events extends Model<Client_has_EventsAttrs> {
  @AllowNull(false)
  @ForeignKey(() => Clients)
  @Column(DataType.INTEGER)
  clientId: number;

  @AllowNull(false)
  @ForeignKey(() => Events)
  @Column(DataType.INTEGER)
  eventId: number;

  @Column(DataType.BOOLEAN)
  isPaid: boolean;

  @Column(DataType.BOOLEAN)
  isRemoved: boolean;

  @Column(DataType.BOOLEAN)
  isNotGoing: boolean;
}
export default Clients_has_Events;

import {
  Table,
  Column,
  Model,
  DataType,
  BelongsToMany,
  AllowNull,
} from "sequelize-typescript";
import Events from "./events";
import Clients_has_Events from "./clients_has_events";

export interface ClientAttrs {
  id?: number;
  userName: string;
  password: string;
  otp: string | null;
  status: string;
  src: string;
  email: string;
  imageUuid: string;
}

// Define the Client model
@Table({
  tableName: "clients", // Set the table name
  timestamps: true, // Add timestamps (createdAt, updatedAt)
})
class Clients extends Model<ClientAttrs> {
  @Column({
    type: DataType.INTEGER,
    autoIncrement: true,
    primaryKey: true,
    allowNull: false,
  })
  id?: number;

  @AllowNull(false)
  @Column({
    type: DataType.STRING,
  })
  userName: string;

  @AllowNull(false)
  @Column({
    type: DataType.STRING,
  })
  password: string;

  @AllowNull(true)
  @Column({
    type: DataType.STRING,
  })
  src: string;

  @AllowNull(true)
  @Column({
    type: DataType.STRING,
  })
  imageUuid: string;

  @BelongsToMany(() => Events, {
    through: { model: () => Clients_has_Events },
    onDelete: "CASCADE",
  })
  events: Events[];

  @AllowNull(true)
  @Column({
    type: DataType.STRING,
  })
  status: string;

  @AllowNull(true)
  @Column({
    type: DataType.STRING,
  })
  otp: string;

  @AllowNull(false)
  @Column({
    type: DataType.STRING,
    unique: true,
  })
  email: string;
}
export default Clients;

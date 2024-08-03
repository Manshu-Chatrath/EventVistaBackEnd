import {
  Table,
  Column,
  Model,
  DataType,
  AllowNull,
} from "sequelize-typescript";

export interface NotificationAttrs {
  id?: number;
  notificationTypeId: number;
  notificationType: string;
  message: string;
  senderId?: number;
  senderType?: string;
  receiverId: number;
  receiverType: string;
  eventId: number;
}

// Define the Client model
@Table({
  tableName: "notifications", // Set the table name
  timestamps: true, // Add timestamps (createdAt, updatedAt)
})
class Notifications extends Model<NotificationAttrs> {
  @Column({
    type: DataType.INTEGER,
    autoIncrement: true,
    primaryKey: true,
    allowNull: false,
  })
  id?: number;

  @AllowNull(true)
  @Column({
    type: DataType.INTEGER,
  })
  notificationTypeId: number;

  @AllowNull(true)
  @Column({
    type: DataType.STRING,
  })
  notificationType: string;

  @AllowNull(true)
  @Column({
    type: DataType.STRING,
  })
  message: string;

  @AllowNull(false)
  @Column({
    type: DataType.INTEGER,
  })
  eventId: number;

  @AllowNull(true)
  @Column({
    type: DataType.STRING,
  })
  receiverType: string;

  @AllowNull(true)
  @Column({
    type: DataType.INTEGER,
  })
  senderId: number;

  @AllowNull(true)
  @Column({
    type: DataType.INTEGER,
  })
  receiverId: number;

  @AllowNull(true)
  @Column({
    type: DataType.STRING,
  })
  senderType: string;
}
export default Notifications;

import {
  Table,
  Column,
  Model,
  DataType,
  AllowNull,
} from "sequelize-typescript";
export interface OrganizerAttrs {
  id?: number;
  password: string;
  src: string;
  contactNumber: string;
  otp: string | null;
  email: string;
  status: string;
  userName: string;
  imageUuid: string;
}
@Table({
  tableName: "organizers", // Set the table name
  timestamps: true, // Add timestamps (createdAt, updatedAt)
})
class Organizers extends Model<OrganizerAttrs> {
  @Column({
    type: DataType.INTEGER,
    autoIncrement: true,
    primaryKey: true,
    allowNull: false,
  })
  id: number;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  userName: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  status: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  password: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  imageUuid: string;

  @AllowNull(true)
  @Column({
    type: DataType.STRING,
  })
  src: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  contactNumber!: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    unique: true,
  })
  email: string;

  @AllowNull(true)
  @Column({
    type: DataType.STRING,
  })
  otp: string;
}
export default Organizers;

import { Response } from "express";
import { DatabaseConnectionError } from "../errors/database-connection-error";
export const dataBaseConnectionError = (res: Response) => {
  const dataBaseError = new DatabaseConnectionError(
    "Some Unexpected Error Occured"
  );
  return res
    .status(dataBaseError.statusCode)
    .send({ message: dataBaseError.message });
};

import { CustomError } from "./custom-error";

export class DatabaseConnectionError extends CustomError {
  statusCode: number = 500;
  message: string;

  constructor(message: string) {
    super();
    this.message = message;
  }

  serializeMethodErrors() {
    return { statusCode: this.statusCode, message: this.message };
  }
}

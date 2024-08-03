import { CustomError } from "./custom-error";

export class BadRequestError extends CustomError {
  statusCode: number = 400;
  message: string;
  constructor(message: string) {
    super();
    this.message = message;
  }
  serializeMethodErrors() {
    return { statusCode: this.statusCode, message: this.message };
  }
}

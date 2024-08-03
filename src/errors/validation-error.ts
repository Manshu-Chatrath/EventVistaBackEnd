import { CustomError } from "./custom-error";

export class RequestValidationError extends CustomError {
  statusCode = 400;
  message: string;
  constructor(message: string) {
    super();
    this.message = message;
  }

  serializeMethodErrors() {
    return { message: this.message, statusCode: this.statusCode };
  }
  static parametersErrors(arr: string[], obj: any) {
    let isErrorExist = false;
    for (let key in obj) {
      if (!arr.includes(key)) {
        isErrorExist = true;
        break;
      }
    }
    if (isErrorExist) {
      return true;
    }
  }
}

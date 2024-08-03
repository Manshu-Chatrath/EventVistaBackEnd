export abstract class CustomError {
  abstract statusCode: number;
  abstract message: string;
  abstract serializeMethodErrors(): { message: string; statusCode: number };
}

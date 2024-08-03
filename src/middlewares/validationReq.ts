import { Request, Response, NextFunction } from "express";
import { validationResult } from "express-validator";
import { RequestValidationError } from "../errors/validation-error";
export const validateRequest = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const requestValidationError = new RequestValidationError(
      "Invalid Parameters!"
    );
    return res.status(requestValidationError.statusCode).send({
      message: requestValidationError.message,
      error: errors.array()[0].msg,
    });
  }
  next();
};

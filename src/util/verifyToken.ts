import dotenv from "dotenv";
dotenv.config();
const jwt = require("jsonwebtoken");
export const verifyToken = (token: string) => {
  try {
    // Verify the token
    const decoded = jwt.verify(token, process.env.SECRET_KEY);
    return decoded;
  } catch (error) {
    // Token is invalid or has expired
    return null;
  }
};

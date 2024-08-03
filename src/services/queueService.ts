import Bull from "bull";
import dotenv from "dotenv";
dotenv.config();

const { REDIS_URL } = process.env;

export const notificationQueue = new Bull("notificationQueue", `${REDIS_URL}`);

export const eventQueue = new Bull("eventQueue", `${REDIS_URL}`);

export const userQueue = new Bull("userQueue", `${REDIS_URL}`);

import express from "express";
import sequelize from "./database";
import { signUpRouter } from "./routes/signup";
import { v4 as uuidv4 } from "uuid";
import { loginRouter } from "./routes/login";
import { uploadRouter } from "./routes/upload";
import { userRouter } from "./routes/user";
import { eventChatRouter } from "./routes/event_chat";
import { Websocket } from "./services/socket";
import { eventRouter } from "./routes/events";
import { imageTextExtractorRouter } from "./routes/imageTextExtractor";
const app = express();
const id = uuidv4();
const cors = require("cors");
const http = require("http");
const WebSocket = require("ws");
app.use(cors());
app.use(imageTextExtractorRouter);
app.use(express.json());
app.use(signUpRouter);
app.use(loginRouter);
app.use(userRouter);
app.use(uploadRouter);
app.use(eventRouter);
app.use(eventChatRouter);
const server = http.createServer(app);

const wss = new WebSocket.Server({ server });

const websocket = new Websocket(wss, id);
websocket.initialize();

sequelize
  .sync()
  .then((res) => {
    server.listen(3000, () =>
      console.log(`Server is running on http://localhost:3000`)
    );
  })
  .catch((err) => console.log(err));

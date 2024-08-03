import * as AWS from "aws-sdk";
import express, { Request, Response } from "express";
import { v1 as uuid } from "uuid";
import { isAuth } from "../middlewares/isAuth";
import { DatabaseConnectionError } from "../errors/database-connection-error";
import Organizers from "../models/organizers";
import { MyRequest } from "../middlewares/isAuth";
import Clients from "../models/clients";
import Events from "../models/events";
import dotenv from "dotenv";
dotenv.config();
const router = express.Router();

const s3 = new AWS.S3({
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
  region: "ca-central-1",
});

const getSignedUrl = (imageKey: string, res: Response) => {
  s3.getSignedUrl(
    "putObject",
    {
      Bucket: "eventvista",
      Key: imageKey,
      ContentType: "image/*",
      Expires: 360000,
    },
    (err: Error, url: string) => {
      if (err) {
        return res.status(500).send({ message: "Some error occured!" });
      }

      return res.send({ imageKey, url });
    }
  );
};

router.get(
  "/getImageUrl/upload",
  isAuth,
  async (req: MyRequest, res: Response) => {
    {
      try {
        const type: any = req.query.type;
        const id: any = req.query.id;

        const model =
          req.query.type === "organizer"
            ? await Organizers.findOne({
                where: { id: id },
              })
            : req.query.type === "client"
            ? await Clients.findOne({
                where: { id: id },
              })
            : req.query.type === "events"
            ? await Events.findOne({ where: { id: id } })
            : null;

        const Model: any =
          req.query.type === "organizer"
            ? Organizers
            : req.query.type === "client"
            ? Clients
            : req.query.type === "events"
            ? Events
            : null;
        const imageUuid = uuid();
        const imageKey = `${id}${type}/${imageUuid}`;
        await Model.update({ imageUuid: imageUuid }, { where: { id: id } });
        if (model?.imageUuid) {
          s3.deleteObject(
            {
              Bucket: "eventvista",
              Key: `${id}${type}/${model.imageUuid}`,
            },
            function (err: Error) {
              if (err) {
                return res.status(500).send({ message: "Some error occured!" });
              }
            }
          );
        }
        getSignedUrl(imageKey, res);
      } catch (err) {
        console.log(err);
        const dataBaseConnectionError = new DatabaseConnectionError(
          "Some Unexpected Error Occured!"
        );
        return res
          .status(dataBaseConnectionError.statusCode)
          .send({ message: dataBaseConnectionError.message });
      }
    }
  }
);

router.post("/image/upload", isAuth, async (req: MyRequest, res: Response) => {
  const Model: any =
    req.body.type === "organizer"
      ? Organizers
      : req.body.type === "client"
      ? Clients
      : req.body.type === "events"
      ? Events
      : null;

  const { url, eventId = null } = req.body;
  const imageUrl = `https://eventvista.s3.ca-central-1.amazonaws.com/${url}`;

  try {
    await Model.update({ src: imageUrl }, { where: { id: req.body.id } });
    return res.send({ src: imageUrl });
  } catch (err) {
    console.log(err);
    const dataBaseConnectionError = new DatabaseConnectionError(
      "Some Unexpected Error Occured!"
    );
    return res
      .status(dataBaseConnectionError.statusCode)
      .send({ message: dataBaseConnectionError.message });
  }
});

export { router as uploadRouter };

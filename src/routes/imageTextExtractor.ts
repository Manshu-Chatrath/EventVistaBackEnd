import { isAuth } from "../middlewares/isAuth";
import { MyRequest } from "../middlewares/isAuth";
import express, { Response } from "express";
import OpenAI from "openai";
import dotenv from "dotenv";
const router = express.Router();
const vision = require("@google-cloud/vision");
dotenv.config();
const credential = {
  type: "service_account",
  project_id: "confident-key-280102",
  private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
  private_key: process.env.GOOGLE_KEY,
  client_email: "personal-project@confident-key-280102.iam.gserviceaccount.com",
  client_id: process.env.GOOGLE_CLIENT_ID,
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url:
    "https://www.googleapis.com/robot/v1/metadata/x509/personal-project%40confident-key-280102.iam.gserviceaccount.com",
  universe_domain: "googleapis.com",
};
const client = new vision.ImageAnnotatorClient({
  credentials: credential,
});

const openai = new OpenAI({
  apiKey: process.env.OPEN_AI_KEY!,
});

async function extractTextFromImage(imageUrl: string) {
  try {
    const imageBuffer = Buffer.from(imageUrl, "base64");
    const request = {
      image: {
        content: imageBuffer.toString("base64"),
      },
    };
    const [result] = await client.textDetection(request);
    const detections = result.textAnnotations;
    let str = "";

    detections.forEach((t: any) => (str += t.description));

    const chatCompletion = await openai.chat.completions.create({
      messages: [
        {
          role: "user",
          content: `Give me event date, time, location, title and about from this text in form of valid json string without using '\n' in it
             {startTime:'',endTime:'',location:'', eventName:'',about:'',eventDate:'', participantsLimit: in integer} also please give date in format of MM-DD-YYYY and if some property of given object is missing give it value of null  "${str}", also the date in form of dd-mm-yyy and time should be in hh:mm.`,
        },
      ],
      model: "gpt-3.5-turbo",
    });

    const re = chatCompletion.choices[0]!.message.content;
    return JSON.parse(re!);
  } catch (e) {
    console.log(e);
  }
}

router.post(
  "/extractText/image",
  isAuth,
  express.json({ limit: "50mb" }), // for parsing application/json
  async (req: MyRequest, res: Response) => {
    try {
      const { base64 } = req.body;
      const imageTextObj = await extractTextFromImage(base64);

      return res.status(200).send({ imageTextObj: imageTextObj });
    } catch (e) {
      console.log(e);
    }
  }
);

export { router as imageTextExtractorRouter };

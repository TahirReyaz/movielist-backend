import express from "express";
import http from "http";
import bodyParser from "body-parser";
import cors from "cors";
import cookieParser from "cookie-parser";
import compression from "compression";
import mongoose from "mongoose";
import dotenv from "dotenv";

import router from "./router";

dotenv.config();

const app = express();

app.use(cors({ credentials: true, origin: process.env.FRONTEND_URL }));

app.use(compression());
app.use(cookieParser());
app.use(bodyParser.json());

const server = http.createServer(app);

const port = process.env.PORT || 3000;

mongoose.Promise = Promise;
mongoose.connect(process.env.MONGO_URL);
// Change the mongo password to a more secure one
mongoose.connection.on("error", (error: Error) => console.log(error));

app.use("/", router());

server.listen(port, () => {
  console.log("Server running on http://localhost:", port);
});

import * as dotenv from "dotenv";
import net from "node:net";
import { createBrotliCompress } from "node:zlib";

dotenv.config();

const PORT = process.env.PORT ?? 8080;

const server = net.createServer((connection) => {
  console.log("client connected");

  connection.on("end", () => {
    console.log("client disconnected");
  });

  connection.on("data", (data) => {
    // First line request line - METHOD PATH VERSION
    const dataMap = data.toString().split("\n");
    if (dataMap.length === 0) return;
    const [method, path, version] = dataMap[0].split(" ");

    console.log({
      method,
      path,
      version,
    });
  });
});

server.on("error", (err) => {
  throw err;
});

server.listen(PORT, () => {
  console.log("Server bound to port " + PORT);
});

console.log("HTTP Server starting...");

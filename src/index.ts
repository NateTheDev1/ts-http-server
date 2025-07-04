import * as dotenv from "dotenv";
import net from "node:net";

dotenv.config();

const PORT = process.env.PORT ?? 8080;

const StatusCodes = {
  OK: [200, "OK"],
  METHOD_NOT_ALLOWED: [405, "Method Not Allowed"],
  NOT_FOUND: [404, "Not Found"],
};

const parseHeaders = (dataMap: string[]) => {
  const headers: Record<string, string> = {};

  let idx = 1;

  while (dataMap[idx] !== "\r" && idx < dataMap.length - 2) {
    const [k, v] = dataMap[idx].split(":");
    headers[k.trim().toLowerCase()] = v.trim();
    idx++;
  }

  return headers;
};

const buildRequestObject = (dataMap: string[]) => {
  const [method, pathBase, version] = dataMap[0].split(" ");

  const pathParts = pathBase.split("?");

  const path = pathParts[0];

  const queryParts = pathParts.length > 1 ? pathParts[1].split("&") : [];

  const query: Record<string, string> = {};

  const body = dataMap[dataMap.length - 1];

  for (let i = 0; i < queryParts.length; i++) {
    const [k, v] = queryParts[i].split("=");
    query[k] = v;
  }

  return {
    method,
    path,
    version: version.replace("\r", ""),
    headers: parseHeaders(dataMap),
    query,
    body,
  };
};

type ResponseBuilder = { status: string; contentType: string; body: string };

type Request = {
  body: string;
};

const routeMap: Record<
  string,
  {
    methods: {
      GET: undefined | (() => ResponseBuilder);
      POST: undefined | ((req: Request) => ResponseBuilder);
    };
  }
> = {
  "/": {
    methods: {
      GET: () => {
        return {
          body: "Hello World",
          contentType: "text/plain",
          status: `${StatusCodes.OK[0]} ${StatusCodes.OK[1]}`,
        };
      },
      POST: undefined,
    },
  },
  "/echo": {
    methods: {
      GET: undefined,
      POST: (req: Request) => {
        const body: Record<string, string> = {};

        const parts = req.body.split("&");

        for (let i = 0; i < parts.length; i++) {
          const [k, v] = parts[i].split("=");
          body[k] = v;
        }

        return {
          body: JSON.stringify(body),
          contentType: "application/json",
          status: `${StatusCodes.OK[0]} ${StatusCodes.OK[1]}`,
        };
      },
    },
  },
};

const handleRoute = (
  path: string,
  method: string,
  req: Request
): ResponseBuilder => {
  let status = "404 Not Found";
  let contentType = "text/plain";
  let body = "Not Found";

  const foundRoute = routeMap[path];

  if (foundRoute) {
    switch (method) {
      case "GET": {
        if (foundRoute.methods.GET !== undefined) {
          return foundRoute.methods.GET();
        }
        break;
      }
      case "POST": {
        if (foundRoute.methods.POST !== undefined) {
          return foundRoute.methods.POST(req);
        }
        break;
      }
      default: {
        return {
          contentType,
          status: `${StatusCodes.METHOD_NOT_ALLOWED[0]} ${StatusCodes.METHOD_NOT_ALLOWED[1]}`,
          body: "Method Not Allowed",
        };
      }
    }
  }

  return {
    status,
    contentType,
    body,
  };
};

const server = net.createServer((connection) => {
  console.log("client connected");

  connection.on("end", () => {
    console.log("client disconnected");
  });

  connection.on("data", (data) => {
    const dataMap = data.toString().split("\n");
    if (dataMap.length === 0) return;

    const request = buildRequestObject(dataMap);

    const responseBuilder = handleRoute(request.path, request.method, {
      body: request.body,
    });

    const response = `${request.version} ${responseBuilder.status}\r\n Content-Type: ${responseBuilder.contentType}\r\n Content-Length: ${responseBuilder.body.length} \r\n\r\n ${responseBuilder.body}`;

    connection.write(response);
    connection.end();
  });
});

server.on("error", (err) => {
  throw err;
});

server.listen(PORT, () => {
  console.log("Server bound to port " + PORT);
});

console.log("HTTP Server starting...");

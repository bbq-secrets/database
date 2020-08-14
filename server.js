const jsonServer = require("json-server");
const server = jsonServer.create();

server.all("*", function (req, res, next) {
  if (req.method === "GET") {
    next();
  } else {
    res.sendStatus(403);
  }
});

const router = jsonServer.router("database.json");
const middlewares = jsonServer.defaults();
const port = process.env.PORT || 3000;

server.use(middlewares);
server.use(router);

server.listen(port);

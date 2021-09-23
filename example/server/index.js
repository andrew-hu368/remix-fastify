const path = require("path");
const fastify = require("fastify");
const fastifyStatic = require("fastify-static");
const { createRequestHandler } = require("@mcansh/remix-fastify");
const rawBody = require("raw-body");

const BUILD_DIR = "./build";
const BUILD_DIR_PATH = path.join(process.cwd(), "server", BUILD_DIR);
const MODE = process.env.NODE_ENV;

let app = fastify({ logger: { level: "trace" } });

app.addContentTypeParser("*", (req, done) => {
  rawBody(
    req,
    {
      length: req.headers["content-length"],
      limit: "1mb",
      encoding: "utf-8",
    },
    (err, body) => {
      if (err) return done(err);
      done(null, body);
    }
  );
});

app.register(fastifyStatic, {
  root: path.join(process.cwd(), "public"),
  prefix: "/static",
});

console.log(path.join(process.cwd(), "public"));

app.all(
  "*",
  MODE === "production"
    ? createRequestHandler({ build: require(BUILD_DIR_PATH) })
    : (request, reply) => {
        purgeRequireCache();
        createRequestHandler({
          build: require(BUILD_DIR_PATH),
          mode: "development",
        })(request, reply);
      }
);

let port = process.env.PORT || 3000;

async function start() {
  try {
    await app.listen(port, () => {
      console.log(`Fastify server listening on port ${port}`);
    });
  } catch (error) {
    app.log.error(error);
  }
}

start();

////////////////////////////////////////////////////////////////////////////////
function purgeRequireCache() {
  // purge require cache on requests for "server side HMR" this won't let
  // you have in-memory objects between requests in development,
  // alternatively you can set up nodemon/pm2-dev to restart the server on
  // file changes, we prefer the DX of this though, so we've included it
  // for you by default
  for (let key in require.cache) {
    if (key.startsWith(BUILD_DIR_PATH)) {
      delete require.cache[key];
    }
  }
}

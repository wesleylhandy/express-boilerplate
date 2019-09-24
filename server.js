const express = require("express");
const bodyParser = require("body-parser");
const compression = require("compression");
const cors = require("cors");
const session = require("express-session");
const multer = require("multer");
const logger = require("morgan");
const upload = multer();
const methodOverride = require("method-override");
const passport = require("passport");

process.title = "ExpressServer";

if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

const app = express();

//allow PUT, PATCH, DELETE via _method param
app.use(methodOverride("_method"));
// override with different headers; last one takes precedence
app.use(methodOverride("X-HTTP-Method")); //          Microsoft
app.use(methodOverride("X-HTTP-Method-Override")); // Google/GData
app.use(methodOverride("X-Method-Override")); //      IBM

app.use(cors());

// Use morgan for logs
app.use(logger("dev"));

// Specify the port.
var port = process.env.PORT || 8080;

//support gzip
app.use(compression());

//body parser for routes our app
app.use(bodyParser.json());
// parsing application/json
app.use(
  bodyParser.urlencoded({
    extended: true
  })
);
app.use(bodyParser.text());
app.use(bodyParser.json({ type: "application/vnd.api+json" }));

// for parsing multipart/form-data
app.use(upload.array());

const MongoDBStore = require("connect-mongodb-session")(session);

const store = new MongoDBStore({
  uri:
    process.env.MONGODB_CONNECT_STRING ||
    "mongodb://localhost:27017/connect_mongodb_session",
  collection: "mySessions"
});

store.on("error", error => {
  console.log(error);
});

const uuidv4 = require("uuid/v4");

const sess = {
  cookie: { maxAge: 30 * 24 * 60 * 60 * 1000 },
  secret: process.env.SESSION_SECRET,
  saveUninitialized: true,
  resave: true,
  store: store,
  genid: function(req) {
    return uuidv4(); // use UUIDs for session IDs
  }
};

if (app.get("env") === "production") {
  app.set("trust proxy", 1); // trust first proxy
  sess.cookie.secure = true; // serve secure cookies
}

app.use(session(sess));

//middleware to display session data in console during development and staging only
if (process.env.NODE_ENV !== "production") {
  app.use((req, res, next) => {
    console.log("");
    console.log("*************SESSION MIDDLEWARE***************");
    console.log(req.session);
    console.log("");
    console.log("Logged In: ");
    console.log("__________ " + req.isAuthenticated());
    console.log("**********************************************");
    console.log("");
    next();
  });
}

app.set("port", port);

const MongoClient = require("mongodb").MongoClient;
const assert = require("assert");
const dbName = process.env.DBNAME || "test";
const uri =
  process.env.MONGODB_CONNECT_STRING || `mongodb://localhost:27017/${dbName}`;
const client = new MongoClient(uri, { useNewUrlParser: true });

let server;
client.connect((err, client) => {
  "use strict";
  //test connection for errors, will stop app if Mongo connection is down on load
  assert.equal(null, err);
  assert.ok(client !== null);
  console.log("Somewhere a SQLFairy lost it's wings...Mongo Pokémon evolved.");

  const db = client.db(dbName);

  // create new DAO for handling user authentication
  const UsersDAO = require("./models/user.js");
  const usersDAO = new UsersDAO(db, "users");

  // pass DAO to passport strategy
  // require('./strategies/initGoogleStrategy')(usersDAO)
  require("./strategies/initLocalStrategy")(usersDAO);

  passport.serializeUser((user, done) => {
    done(null, user);
  });

  passport.deserializeUser(async (userID, done) => {
    const foundUser = await usersDAO.getUser({ id: userID });
    done(null, foundUser);
  });

  app.use(passport.initialize());
  app.use(passport.session());

  require("./controllers/auth-controller")(app, usersDAO);

  // set up rate limits for access to backend to prevent DDOS attacks
  const RateLimit = require("express-rate-limit");
  const apiLimiter = new RateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100
  });

  app.get("/", (req, res, next) => {
    res.send("Hello World!");
  });

  app.use("/", apiLimiter);

  // Listen on port 3000 or assigned port
  server = app.listen(app.get("port"), () =>
    console.log(
      `\nAttention citizens, tune to channel ${app.get(
        "port"
      )}...Express Pokémon evolved.\n`
    )
  );
});

const gracefulShutdown = () => {
  console.log("Received kill signal, shutting down gracefully.");
  server.close(() => {
    console.log("Closed out remaining connections.");
    process.exit(1);
  });

  // if after
  setTimeout(function() {
    console.error(
      "Could not close connections in time, forcefully shutting down"
    );
    process.exit(1);
  }, 10 * 1000);
};

// listen for TERM signal .e.g. kill
process.on("SIGTERM", gracefulShutdown);

// listen for INT signal e.g. Ctrl-C
process.on("SIGINT", gracefulShutdown);

process.on("unhandledRejection", reason => {
  if (reason) {
    console.error({ Error: reason });
  }
  process.exit(1);
});

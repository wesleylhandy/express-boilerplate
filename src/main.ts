import cluster from "cluster";
import http from "http";
// import socketIO from "socket.io"; TODO: Add WS support
import sticky from "sticky-session"; // to enable sticky sessions
import { expressApp } from "./server/app";
import { initLogger } from './utils/logger'

const workerId = cluster.worker?.id ?? process.pid;
const id = cluster.isPrimary ? process.pid : workerId;
process.title = cluster.isPrimary ? 'ClusterServer' : `Worker ${workerId}`;

const logger = initLogger();
const app = expressApp(id, logger);

const server = http.createServer(app);
// const io = socketIO(server); // for socket support

if (!sticky.listen(server, app.get("port"))) {
  // MASTER
  server.once("listening", () => {
    logger.log('info', 
      `Attention citizens of Master Realm ${id}, tune to channel ${app.get(
        "port"
      )}...Express Pokémon evolved.`
    );
  });
} else {
  // WORKERS
  logger.log('info', 
    `Attention citizens of Worker Realm ${id}, tune to channel ${app.get(
      "port"
    )}...Express Pokémon evolved.`
  );
}

process.on("message", message => {
  logger.log('info', `Process ${id} receives message '${JSON.stringify(message)}'`);
});

const gracefulShutdown = () => {
  logger.log('info', `Process ${id} received kill signal, shutting down gracefully.`);
  server.close(() => {
    logger.log('info',`Process ${id} closed out remaining connections.`);
    process.exit(0);
  });

  // if after
  const timeout = setTimeout(function() {
    logger.log('error', "Could not close connections in time, forcefully shutting down");
    process.exit(1);
  }, 10 * 1000);
};

// listen for TERM signal .e.g. kill
process.on("SIGTERM", gracefulShutdown);

// listen for INT signal e.g. Ctrl-C
process.on("SIGINT", gracefulShutdown);

process.on("unhandledRejection", error => {
  if (error) {
    logger.log('error', JSON.stringify({ UnhandledRejection: error }));
  }
});

process.on("error", error => {
  if (error) {
    logger.log('error', JSON.stringify({ ProcessError: error }));
  }
});
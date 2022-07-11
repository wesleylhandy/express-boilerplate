import cluster from "cluster";
import http from "http";
// import socketIO from "socket.io"; TODO: Add WS support
import sticky from "sticky-session"; // to enable sticky sessions
import { configureWorkerApp } from "./server/worker";
import { valueFromEnvironment, EnvVars } from "./utils/environment-variables";
import { configureFileLogger } from './utils/logger'

const workerId = cluster.worker?.id ?? process.pid;
const id = cluster.isPrimary ? process.pid : workerId;
process.title = cluster.isPrimary ? 'ClusterServer' : `Worker ${workerId}`;

const isProduction = valueFromEnvironment(EnvVars.NODE_ENV) === 'production';

const logger = configureFileLogger(isProduction);
const worker = configureWorkerApp({ workerId: id, logger, isProduction });

const server = http.createServer(worker.app);
// TODO: CREATE SOCKET SUPPORT
// const io = socketIO(server); // for socket support

if (!sticky.listen(server, worker.port)) {
  // MAIN
  server.once("listening", () => {
    logger.log('info', 
      `Main Cluster ${id} running on port ${worker.port}.`
    );
  });
} else {
  // WORKERS
  logger.log('info', 
    `Worker ${id} running on port ${worker.port}.`
  );
}

// TODO: Handle Process Signaling Queue
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
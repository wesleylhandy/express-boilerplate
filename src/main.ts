import cluster from "cluster";
import http from "http";
import { cpus } from "os";
import { Server } from "socket.io"; 
import { setupMaster as setupMain, setupWorker } from '@socket.io/sticky';
import { createAdapter, setupPrimary } from "@socket.io/cluster-adapter";
import { configureWorkerApp } from "./server/worker";
import { valueFromEnvironment, EnvVars } from "./utils/environment-variables";
import { configureFileLogger } from './utils/logger'

const workerId = cluster.worker?.id ?? process.pid;
const id = cluster.isPrimary ? process.pid : workerId;
process.title = cluster.isPrimary ? 'ClusterServer' : `Worker ${workerId}`;

const isProduction = valueFromEnvironment(EnvVars.NODE_ENV) === 'production';

const logger = configureFileLogger(isProduction);
const worker = configureWorkerApp({ workerId: id, logger, isProduction });

const httpServer = http.createServer(worker.app);

if (cluster.isPrimary) {
  // MAIN
  logger.log('info', 
    `Main Cluster ${id} running on port ${worker.port}.`
  );
    // setup sticky sessions
  setupMain(httpServer, {
    loadBalancingMethod: "least-connection",
  });

  // setup connections between the workers
  setupPrimary()

  httpServer.listen(worker.port)

  for (let i = 0; i < cpus().length; i++) {
    cluster.fork();
  }

  cluster.on("exit", (worker) => {
    logger.log('info', `Worker ${worker.process.pid} died`);
    cluster.fork();
  });

} else {
  // WORKER 
  logger.log('info', 
    `Worker ${id} running on port ${worker.port}.`
  );

  // TBD: Should this be injected into each worker to managed here?
  const io = new Server(httpServer);

  // use the cluster adapter
  io.adapter(createAdapter());

  // setup connection with the primary process
  setupWorker(io);

  // NOTE: Handle Socket communication here
  io.on("connection", (socket) => {
    /* ... */
  });
}

// TODO: Handle Process Signaling Queue
process.on("message", message => {
  logger.log('info', `Process ${id} received message '${JSON.stringify(message, null, 5)}'`);
});

const gracefulShutdown = () => {
  logger.log('info', `Process ${id} received kill signal, shutting down gracefully.`);
  httpServer.close(() => {
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
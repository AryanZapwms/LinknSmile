// ecosystem.config.js
//
// PM2 process definition for production. Lives at the repo root so it
// ships inside every release — the deploy/rollback scripts always invoke
// it via the stable "current" symlink (e.g. /home/linknsmile.com/current/
// ecosystem.config.js), never a specific release path, so `pm2 reload`
// always picks up whatever code "current" points to *at reload time*.
//
// Cluster mode + reload is what makes deploys zero-downtime: PM2 restarts
// the `instances` workers one at a time, so there's always at least one
// worker serving traffic. See DEPLOYMENT.md for the tradeoffs.
//
// NOTE: `script` points directly at Next's JS entrypoint rather than
// `npm start` — PM2 cluster mode requires forking the actual Node script,
// not a shell wrapper, otherwise it can't manage the cluster workers.
//
// Parameterized for multi-deployment (added for the UAE instance): name,
// app root, port, and instance count all read from optional PM2_* env
// vars, defaulting to India's existing values so India's deploy/rollback
// workflows need zero changes and behave byte-identically to before.
// Each deployment (India, UAE, ...) has its own APP_ROOT on the VPS with
// its own releases/current/shared dir, so this file only ever describes
// ONE app per `pm2 startOrReload` invocation — deliberately not a
// multi-app array, so an India deploy can never reach into/restart the
// UAE PM2 process (or vice versa). See .github/workflows/deploy-ae.yml
// and PROJECT_SOURCE_OF_TRUTH.md §11 for how UAE sets these.
const APP_NAME = process.env.PM2_APP_NAME || "linknsmile";
const APP_ROOT = process.env.PM2_APP_ROOT || "/home/linknsmile.com";
const PORT = Number(process.env.PM2_PORT) || 3004;
const INSTANCES = Number(process.env.PM2_INSTANCES) || 2;

module.exports = {
  apps: [
    {
      name: APP_NAME,
      cwd: `${APP_ROOT}/current`,
      script: "node_modules/next/dist/bin/next",
      args: `start -p ${PORT}`,
      instances: INSTANCES, // 6 CPU cores on the VPS — 2 leaves headroom for other sites/services on the box; bump if this app gets dedicated capacity
      exec_mode: "cluster",
      env: {
        NODE_ENV: "production",
        PORT,
      },
      out_file: `${APP_ROOT}/shared/logs/out.log`,
      error_file: `${APP_ROOT}/shared/logs/error.log`,
      merge_logs: true,
      time: true,
      max_memory_restart: "500M",
      kill_timeout: 5000,
    },
  ],
};

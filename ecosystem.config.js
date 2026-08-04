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
module.exports = {
  apps: [
    {
      name: "linknsmile",
      cwd: "/home/linknsmile.com/current",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3004",
      instances: 2, // 6 CPU cores on the VPS — 2 leaves headroom for other sites/services on the box; bump if this app gets dedicated capacity
      exec_mode: "cluster",
      env: {
        NODE_ENV: "production",
        PORT: 3004,
      },
      out_file: "/home/linknsmile.com/shared/logs/out.log",
      error_file: "/home/linknsmile.com/shared/logs/error.log",
      merge_logs: true,
      time: true,
      max_memory_restart: "500M",
      kill_timeout: 5000,
    },
  ],
};

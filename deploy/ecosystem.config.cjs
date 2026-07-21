// PM2 process file for the LGU PRIME-HRM backend — ALTERNATIVE to the systemd unit.
// Use this if the other apps on the box are already managed by PM2.
//
//   cd /var/www/llcprime/server
//   pm2 start ../deploy/ecosystem.config.cjs
//   pm2 save            # persist across reboots (run `pm2 startup` once, first time)
//   pm2 logs llcprime-api
//
// Env comes from server/.env (loaded by the app via dotenv) — PM2 only sets NODE_ENV/PORT
// here as a backstop; server/.env is the source of truth.
module.exports = {
  apps: [
    {
      name: 'llcprime-api',
      cwd: '/var/www/llcprime/server',
      script: 'dist/app.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: '5010',
      },
      max_restarts: 10,
      restart_delay: 5000,
    },
  ],
};

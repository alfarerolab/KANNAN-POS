module.exports = {
  apps: [
    {
      name: 'sistema-pos',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3000',
      cwd: '/var/www/sistema_pos',

      instances: 1,
      exec_mode: 'fork',

      autorestart: true,
      watch: false,
      max_memory_restart: '800M',

      env: {
        NODE_ENV: 'production'
      },

      error_file: '/var/log/sistema-pos/pm2-error.log',
      out_file: '/var/log/sistema-pos/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true
    }
  ]
};

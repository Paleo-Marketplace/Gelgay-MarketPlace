module.exports = {
  apps: [
    {
      name: 'paleo-api-gateway',
      cwd: './services/api-gateway',
      script: 'server.js',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 5000
      }
    }
  ]
};

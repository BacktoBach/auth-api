export const listen = (app, port, host) => new Promise((resolve, reject) => {
  const server = app.listen(port, host);

  const onError = (error) => {
    server.off('listening', onListening);
    reject(error);
  };

  const onListening = () => {
    server.off('error', onError);
    resolve(server);
  };

  server.once('error', onError);
  server.once('listening', onListening);
});

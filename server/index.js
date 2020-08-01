const path = require('path');
const Koa = require('koa');
const Logger = require('koa-logger');
const BodyParser = require('koa-bodyparser');
const respond = require('koa-respond');
const serve = require('koa-static');
const Cors = require('@koa/cors');

const { initWss } = require('./websockets');
const router = require('./routes');

const app = new Koa();

app.use(Cors());
app.use(serve(path.join(__dirname, 'build')));
app.use(Logger());
app.use(BodyParser());
app.use(respond());

app.use(router.routes());
app.use(router.allowedMethods());

const port = process.env.PORT || 5000;

const server = app.listen(port, () => console.log(`listening on port ${port}`));

const wsHeartbeat = initWss(server);

server.on('close', () => {
  clearInterval(wsHeartbeat);
});

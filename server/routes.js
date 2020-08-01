const Router = require('koa-router');
const send = require('koa-send');

const serveIndexHtml = async (ctx) => {
  ctx.response.status = 200;
  return await send(ctx, 'build/index.html');
};

const router = new Router();

router.prefix('/api').get('/ping', (ctx) => ctx.ok('pong'));
router.get('/', serveIndexHtml);
router.get('(.*)', serveIndexHtml);

module.exports = router;

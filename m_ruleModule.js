const Koa = require('Koa');
const Router = require('koa-router');
const fs = require('fs');
const ip = require('ip').address();
console.log(ip);
const app = new Koa();
const moment = require('moment');
var server = require('http').createServer(app.callback());
var io = require('socket.io')(server);

const router = new Router();

// error handle
app.use(async function (ctx, next) {
    try {
        await next();
    } catch (e) {
        console.log('error', e, ctx);
        app.emit('error', e, ctx);
    }
});

app.use(require('koa2-cors')());

let articles = [], index = 0;

router.get('/', async (ctx, next) => {
    ctx.body = fs.readFileSync('./result.html', 'utf-8');
})

router.get('/article', async (ctx, next) => {
    ctx.body = fs.readFileSync('./article.html', 'utf-8');
})


app.use(router.routes());

server.listen(9000);
// require("openurl").open("http://localhost:9000");

let wechatIo = io.of('/wechat'), resultIo = io.of('/result');
wechatIo.on('connection', function (socket) {

    socket.on('crawler', (crawData) => {
        crawData.crawTime = moment().format('YYYY-MM-DD HH:mm');

    let newData = Object.assign({
        otitle: articles[index].title,
        ourl: articles[index].content_url,
        author: articles[index].author
    }, crawData);

    socket.emit('success');

    resultIo.emit('newData', newData);

    index++;
    if (articles[index]) {
        socket.emit('url', {url: articles[index].content_url, index: index, total: articles.length});
    } else {
        socket.emit('end', {});
    }
});


    socket.on('noData', (crawData) => {
        console.warn(' 超时没有爬取到？ url: ', articles[index].content_url);

    index++;
    if (articles[index]) {
        socket.emit('url', {url: articles[index].content_url, index: index, total: articles.length});
    } else {
        socket.emit('end', {});
    }
});

});


function injectJquery(body) {
    return body.replace(/<\/head>/g, '<script src="https://cdn.bootcss.com/jquery/3.2.1/jquery.min.js"></script><script src="https://cdn.bootcss.com/socket.io/2.0.4/socket.io.js"></script></head>')
}

var injectJsFile = fs.readFileSync('./m_injectJs.js', 'utf-8').replace('{$IP}', ip);
var articleInjectJsFile = fs.readFileSync('./articleInjectJs.js', 'utf-8').replace('{$IP}', ip);
var injectJs = `<script id="injectJs" type="text/javascript">${injectJsFile}</script>`;
var articleInjectJs = `<script id="injectJs" type="text/javascript">${articleInjectJsFile}</script>`;
var fakeImg = fs.readFileSync('./fake.png');
const maxLength = 30;
var stop = 0;
var testUrl = 'https://account.quandashi.com/passport/login';
module.exports = {
    summary: 'wechat articles crawler',
    *beforeSendRequest(requestDetail) {
        // 如果请求图片，直接返回一个本地图片，提升性能
        let accept = requestDetail.requestOptions.headers['Accept'];
        if (accept && accept.indexOf('image') !== -1 && requestDetail.url.indexOf('mmbiz.qpic.cn/') !== -1) {
            return {
                response: {
                    statusCode: 200,
                    header: {'content-type': 'image/png'},
                    body: fakeImg
                }
            };
        }
    },
    *beforeSendResponse(requestDetail, responseDetail) {
        if (requestDetail.url.indexOf(testUrl) != -1) {
            console.log('get  profile_ext', responseDetail.response.header['Content-Type']);

            const newResponse = responseDetail.response;
            let body = responseDetail.response.body.toString();

            newResponse.body = injectJquery(body).replace(/<\/body>/g, injectJs + '</body>');

            let header = Object.assign({}, responseDetail.response.header);
            // 删除微信的安全策略，禁止缓存
            delete header['Content-Security-Policy'];
            delete header['Content-Security-Policy-Report-Only'];
            header['Expires'] = 0;
            header['Cache-Control'] = 'no-cache, no-store, must-revalidate';
            newResponse.header = header;

            return {response: newResponse};


        }

    },
    *beforeDealHttpsRequest(requestDetail) {
        return true;
    },
};

function fetchListEnd_StartArticle() {
    console.log('最终获取文章的列表总数： ', articles.length);
    wechatIo.emit('url', {url: articles[0].content_url, index: 0, total: articles.length});
    resultIo.emit('articles', articles);
}


function resetData() {
    index = 0;
    articles = [];
}
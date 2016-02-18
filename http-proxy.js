'use strict';

const http = require('http');
const url = require('url');
const co = require('co');

/**
 * support only for http-based get request
 *
 * @author kobe.wu
 */

/**
 * 提取原始请求的数据,便于转发
 *
 * @param req
 * @returns {Promise}
 */
function extractRequestPromise(req) {
    return new Promise(function(resolve, reject) {
        let option = extractHttpRequestOption(req);
        let buf = new Buffer(0);
        req.on('data', (chunk) => {
            buf = Buffer.concat([buf, chunk]);
        });

        req.on('end', () => {
            resolve({
                option: option,
                data: buf
            });
        });

        req.on('error', (e) => {
            reject(e);
        })
    });
}

function extractHttpRequestOption(req) {
    let host = req.headers['host'];
    return {
        protocol: 'http:',
        hostname: host.split(':')[0],
        port: parseInt(host.split(':')[1] || '80'),
        headers: req.headers,
        method: req.method,
        path: req.url
    };
}

function fetchResponse(proxyRequest) {
    return new Promise(function(resolve, reject) {
        let httpClientRequest = http.request(proxyRequest.option, function(proxyResponse) {
            let buf = new Buffer(0);
            proxyResponse.on('data', (chunk) => {
                buf = Buffer.concat([buf, chunk]);
            });

            proxyResponse.on('end', () => {
                resolve({
                    res: proxyResponse,
                    data: buf
                });
            });

            proxyResponse.on('error', (e) => {
                reject(e);
            })
        });
        httpClientRequest.on('error', function(e) {
            console.log('error happened' + e);
        })
        httpClientRequest.end(proxyRequest.data);
    });
}

function response2Client(proxyResponseData, res) {
    let proxyResHeaders = proxyResponseData.res.headers;
    proxyResHeaders['test'] = 'xx';
    res.writeHead(proxyResponseData.res.statusCode, proxyResHeaders);
    res.write(proxyResponseData.data);
    res.end();
}

http.createServer(function(req, res){
    co(function *(){
        let proxyRequest = yield extractRequestPromise(req);

        let proxyResponseData = yield fetchResponse(proxyRequest);

        response2Client(proxyResponseData, res);

        console.log('>>>>>>>success proxy url = %s, method = %s', req.url, req.method);
    });
}).listen(9003);
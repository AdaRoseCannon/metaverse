/* eslint-env es6 */
'use strict';

const server = require('http').createServer();
const WebSocketServer = require('ws').Server;
const wss = new WebSocketServer({ server: server });
const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

let i = 1;

app.use(express.static(__dirname + '/static', {
	maxAge: 3600 * 1000 * 24
}));

wss.on('connection', function connection(ws) {
	i++;
	ws.id = i;

	ws.on('message', function incoming(message) {
		ws.buffer = message;
	});

	ws.send('HANDSHAKE:' + i);
});

server.on('request', app);
server.listen(port, function () {
	console.log('Listening on ' + server.address().port)
});

setInterval(function () {
	const arr = wss.clients.map(s => s.buffer).filter(a => !!a);
	const length = wss.clients.length * 8 * 4;
	const data = Buffer.concat(arr, length);
	wss.clients.forEach(ws => ws.send(data, function (e) {
		if (e) {
			console.log(e.message);
			console.log('Oh no! ' + Date.now());
		}
	}));
}, 16);
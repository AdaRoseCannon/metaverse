/* eslint-env es6 */
'use strict';

const server = require('http').createServer();
const WebSocketServer = require('ws').Server;
const wss = new WebSocketServer({ server: server });
const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

// 0th entry is always filled
let ids = [true];
let currentString = '';
let currentSky;
let currentEnvironment;

app.use(express.static(__dirname + '/static', {
	maxAge: 3600 * 1000 * 24
}));

wss.on('connection', function connection(ws) {
	let id = ids.indexOf(false);
	if (id === -1) {
		id = ids.push(true) - 1;
	}
	ws.id = id;

	ws.on('message', function incoming(message) {

		// Rebroadcast any string messages
		if (typeof message === 'string') {
			// update stored string

			let data;

			data = message.match(/^SLIDE:([\s\S]+)/);
			if (data) currentString= data[1];

			data = message.match(/^APPEND:([\s\S]+)/);
			if (data) currentString += data[1];

			data = message.match(/^SKY:([\s\S]+)/);
			if (data) currentSky = data[1];

			data = message.match(/^ENVIRONMENT:([\s\S]+)/);
			if (data) currentEnvironment = data[1];

			wss.clients.forEach(function (ws) {

				ws.send(message, function (e) {
					if (e) {
						console.log(e.message);
						console.log('Oh no! ' + Date.now());
					}
				});
			});
		} else {
			ws.buffer = message;
		}
	});

	ws.send('HANDSHAKE:' + id);
	ws.send('SLIDE:' + currentString);
	if (currentSky) ws.send('SKY:' + currentSky);
	if (currentEnvironment) ws.send('ENVIRONMENT:' + currentEnvironment);
});

server.on('request', app);
server.listen(port, function () {
	console.log('Listening on ' + server.address().port)
});

const presentIds = [];
setInterval(function () {
	// empty ids;
	presentIds.splice(0);
	const arr = wss.clients.map(s => s.buffer).filter(a => !!a);
	const length = wss.clients.length * 8 * 4;
	const data = Buffer.concat(arr, length);
	wss.clients.forEach(function (ws) {
		presentIds.push(ws.id);
		ws.send(data, function (e) {
			if (e) {
				console.log(e.message);
				console.log('Oh no! ' + Date.now());
			}
		})
	});

	// find unused ids to allow users to leave and join in the same slot
	for (let i = 1, l = ids.length; i < l; i++) {
		ids[i] = false;
	}
	for (const n of presentIds) {
		ids[n] = true;
	}
}, 16);
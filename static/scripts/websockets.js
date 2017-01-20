
// start a websocket connection to the server
'use strict';
window.webSocketConnection = new WebSocket((location.hostname === 'localhost' ? 'ws://' : 'wss://') + location.host);
window.webSocketConnection.binaryType = 'arraybuffer';
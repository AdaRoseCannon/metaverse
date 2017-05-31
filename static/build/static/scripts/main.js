'use strict';

/* eslint-env es6 */
/* eslint no-console: 0 */

var constants = {
	SYNC_INTERVAL: 32
};

(function (global) {

	var AFRAME = global.AFRAME;
	var length = 8;
	var SCALE = 512; //for storing decimal as Uint
	var INVERSE_SCALE = 1 / SCALE;
	var MIDDLE = Math.pow(2, 15); //for storing negatives as Uint
	var RAD2DEG = 180 / Math.PI;
	var state = new Uint16Array(length);
	var handshakeReg = /^HANDSHAKE:(.+)/;
	var stage = document.getElementById('stage');
	var avatarContainer = document.getElementById('avatar-container');
	var cameraWrapper = document.getElementById('camera-wrapper');
	var ws = window.webSocketConnection;
	var mode = location.search === '?speaker' && 'speaker' || location.search === '?watcher' && 'watcher' || 'guest';

	if (mode !== 'watcher') {
		document.querySelector('a-scene').setAttribute('avatar-sync', 'enabled: true;');
	}

	// Socket data format
	// 0 id
	// 1-3 position
	// 3-6 rotation
	// 7   misc

	var miscMap = {
		'speaker': 1,
		'celebrate': 2,
		'example2': 4,
		'example3': 8,
		'example4': 16,
		'example5': 32,
		'example6': 64,
		'example7': 128
	};

	function getMiscState(miscState, name) {
		if (!miscMap[name]) throw Error('No field ' + name);
		return miscState & miscMap[name];
	}

	AFRAME.registerSystem('avatar-sync', {
		schema: {
			enabled: {
				default: false
			}
		},
		init: function init() {
			var _this = this;

			if (!this.data.enabled) return;

			setInterval(function () {
				if (!_this.data.enabled) return;

				// only update if data is being sent
				if (_this.webSocket.bufferedAmount !== 0) return;

				// Only update if it has an id
				if (_this.sceneEl.camera && state[0]) {
					_this.updateState({
						rotation: _this.sceneEl.camera.el.object3D.getWorldRotation(),
						position: _this.sceneEl.camera.el.object3D.getWorldPosition()
					});
				}
			}, constants.SYNC_INTERVAL);

			var self = this;
			this.webSocket = ws;

			var avatars = new Map();

			stage.addEventListener('environment-update', function () {

				// trigger id update to update position
				self.updateState({ id: state[0] });
			});

			ws.addEventListener('message', function m(e) {
				if (typeof e.data === 'string' && e.data.match(handshakeReg)) {
					self.updateState({ id: Number(e.data.match(handshakeReg)[1]) });
					return console.log('Connected');
				} else {

					// handle byte data
					if (!e.data.byteLength) return;
					var d = new Uint16Array(e.data);
					var tickOff = new Set(avatars.keys());
					for (var i = 0, l = d.length; i < l; i += length) {

						// Make sure all avatars are accounted for
						var id = d[i];
						tickOff.delete(id);

						// Don't make an avatar for own data'
						if (id === state[0]) continue;

						// if id is 0 ignore it
						if (id === 0) continue;

						// Rehydrate numbers from uint to float
						var posX = (d[i + 1] - MIDDLE) * INVERSE_SCALE;
						var posY = (d[i + 2] - MIDDLE) * INVERSE_SCALE;
						var posZ = (d[i + 3] - MIDDLE) * INVERSE_SCALE;
						var rotX = (d[i + 4] - MIDDLE) * INVERSE_SCALE;
						var rotY = (d[i + 5] - MIDDLE) * INVERSE_SCALE;
						var rotZ = (d[i + 6] - MIDDLE) * INVERSE_SCALE;
						var misc = d[i + 7];
						var avatar = void 0;

						if (!avatars.has(id)) {
							avatar = makeAvatarEl(id);
							console.log('Creating new Avatar', id);

							avatar.body = avatar.firstElementChild;

							avatars.set(id, avatar);

							avatarContainer.appendChild(avatar);
						} else {
							avatar = avatars.get(id);
						}

						if (Number(avatar.dataset.misc || 0) !== misc) {
							if (getMiscState(misc, 'speaker')) {

								avatar.removeChild(avatar.body);
								avatar.insertAdjacentHTML('afterbegin', '<a-entity obj-model="obj: #ada-obj; mtl: #ada-mtl" ada-model scale="0.2 0.2 0.2"></a-entity>');
								avatar.body = avatar.firstChild;

								avatar.setAttribute('scale', '1.5 1.5 1.5');
								avatar.querySelector('.shadow').setAttribute('scale', '1.5 1.5 1.5');
							}
							avatar.dataset.misc = misc;
						}

						// seperating the xz and y rotations allow us to rotate the shadow in place on the floor
						avatar.body.setAttribute('rotation', rotX * RAD2DEG + ' 0 ' + rotZ * RAD2DEG);
						avatar.setAttribute('rotation', '0 ' + rotY * RAD2DEG + ' 0');
						avatar.setAttribute('position', posX + ' ' + (posY + Math.random() * 0.0001) + ' ' + posZ);
					}

					// any not accounted for need to be removed
					tickOff.forEach(function (id) {
						var a = avatars.get(id);
						a.emit('remove');
						avatars.delete(id);
						setTimeout(function () {
							avatarContainer.removeChild(a);
						}, 2000);
					});
				}
			});
		},

		// toggle values in the boolean number
		setMiscState: function setMiscState(name, bool) {
			if (!miscMap[name]) throw Error('No field ' + name);
			state[7] = bool ? state[7] | miscMap[name] : state[7] & ~miscMap[name];
		},

		updateState: function updateState() {
			var _ref = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
			    _ref$id = _ref.id,
			    id = _ref$id === undefined ? null : _ref$id,
			    _ref$position = _ref.position,
			    position = _ref$position === undefined ? null : _ref$position,
			    _ref$rotation = _ref.rotation,
			    rotation = _ref$rotation === undefined ? null : _ref$rotation;

			if (id) {
				console.log('ID recieved from server:' + id);
				state[0] = id;

				if (stage.components.environment) {
					stage.components.environment.setPosition(cameraWrapper, mode, id);
				}

				if (mode === 'speaker') this.setMiscState('speaker', true);
			}
			if (position) state[1] = Math.floor(position.x * SCALE + MIDDLE);
			if (position) state[2] = Math.floor(position.y * SCALE + MIDDLE);
			if (position) state[3] = Math.floor(position.z * SCALE + MIDDLE);
			if (rotation) state[4] = Math.floor(rotation.x * SCALE + MIDDLE);
			if (rotation) state[5] = Math.floor(rotation.y * SCALE + MIDDLE);
			if (rotation) state[6] = Math.floor(rotation.z * SCALE + MIDDLE);
			if (this.webSocket.readyState === 1) this.webSocket.send(state);
		}
	});

	var avatarGen = function avatarGen(color) {
		return '<a-entity>\n        <a-entity obj-model="obj: #student-obj; mtl: #student-mtl" student-model scale="0.4 0.4 0.4" shadow="receive: false;"></a-entity>\n\t\t<a-animation attribute="rotation" from="0 -720 0" to="0 0 0" dur="2300" easing="ease-out-elastic" delay="1000"></a-animation>\n\t\t<a-animation attribute="scale" from="0 0 0" fill="backwards" to="1 1 1" dur="2300" easing="ease-out-elastic" delay="1000"></a-animation>\n\t\t<a-animation attribute="scale" to="0 0 0" from="1 1 1" dur="1800" easing="ease-in-elastic" begin="remove"></a-animation>\n\t\t<a-sphere position="0 0 0" scale="0 0 0" class="avatar-boom" material="color: ' + color + '; shader: flat; transparent: true;">\n\t\t\t<a-animation fill="none" attribute="scale" to="20 20 20" dur="4000"></a-animation>\n\t\t\t<a-animation attribute="material.opacity" to="0" dur="3000"></a-animation>\n\t\t</a-sphere>\n\t\t<a-sphere position="0 0 0" scale="0 0 0" class="avatar-boom" material="color: ' + color + '; side: back; shader: flat; transparent: true;">\n\t\t\t<a-animation fill="none" attribute="scale" to="20 20 20" dur="4000" delay="0.3"></a-animation>\n\t\t\t<a-animation attribute="material.opacity" to="0" dur="3000" delay="0.3"></a-animation>\n\t\t</a-sphere>\n\t</a-entity>';
	};

	function makeAvatarEl(id) {
		return document.createRange().createContextualFragment(avatarGen('hsl(' + id * 137.5 % 360 + ',80%,60%)')).firstElementChild;
	}

	function addCrown(el) {
		el.querySelector('.avatar-body').insertAdjacentHTML('beforeend', '\n\t\t\t<a-entity obj-model="obj: #crown;" position="0.31 0.51 0.17" scale="0.8 0.8 0.8" material="color: #ffc800;; sphericalEnvMap: #sky; metalness: 0.8; roughness:0.3;" rotation="4 -0.5 -9"></a-entity>\n\t\t');
		el.insertAdjacentHTML('beforeend', '<a-entity geometry="primitive: plane;" class="shadow" place-on-ground rotation="-90 0 0" material="shader: flat; src: #shadow; transparent: true; opacity: 0.4;"></a-entity>');
	}

	// for (let id = 0; id < 100; id++) {
	// 	const avatar = makeAvatarEl(id);
	// 	setPosition(avatar, id);
	// 	avatarContainer.appendChild(avatar);
	// }
})(undefined || window);
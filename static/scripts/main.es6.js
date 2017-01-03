/* eslint-env es6 */
/* global AFRAME */
'use strict';
const length = 8;
const SCALE = 1000; //for storing decimal as Uint
const INVERSE_SCALE = 1 / SCALE;
const MIDDLE = Math.pow(2, 31); //for storing negatives as Uint
const RAD2DEG = 180 / Math.PI;
const state = new Uint32Array(length);
const handshakeReg = /HANDSHAKE:(.+)/;
const avatarContainer = document.querySelector('#avatar-container');
const mode = (location.search === '?speaker' && 'speaker') ||
	(location.search === '?watcher' && 'watcher') ||
	'guest';

// Socket data format
// 0 id
// 1-3 position
// 3-6 rotation
// 7   misc

const miscMap = {
	'speaker': 1,
	'celebrate': 2,
	'example2': 4,
	'example3': 8,
	'example4': 16,
	'example5': 32,
	'example6': 64,
	'example7': 128
}

function getMiscState (miscState, name) {
	if (!miscMap[name]) throw Error('No field ' + name);
	return miscState & miscMap[name];
}

function setPosition(el, id) {

	const cols = 12;
	const angle = 12;
	const row = Math.floor(id / cols);
	const pos = cylindricalToCartesian(
		(215 + (id % cols) * angle) / RAD2DEG,
		2 + row * 2,
		(5 + row)* 2
	);
	el.setAttribute('position', `${pos.x} ${pos.y} ${pos.z}`);
}

function cylindricalToCartesian(phi, h, r) {
	return {
		x: r * Math.cos(phi),
		y: h,
		z: r * Math.sin(phi)
	};
}

AFRAME.registerSystem('avatar-sync', {
	init: function () {
		const self = this;

		const ws = new WebSocket((location.hostname === 'localhost' ? 'ws://' : 'wss://') + location.host);
		ws.binaryType = 'arraybuffer';

		this.webSocket = ws;

		const avatars = new Map();

		ws.addEventListener('message', function m(e) {
			if (typeof e.data === 'string' && e.data.match(handshakeReg)) {
				self.updateState({id: Number(e.data.match(handshakeReg)[1])});
				return console.log('Connected');
			} else {

				// handle byte data
				const d = new Uint32Array(e.data);
				const tickOff = new Set(avatars.keys());
				for (let i = 0, l = d.length; i < l; i += length) {

					// Make sure all avatars are accounted for
					const id = d[i];
					tickOff.delete(id);

					// Don't make an avatar for own data'
					if (id === state[0]) continue;

					// if id is 0 ignore it
					if (id === 0) continue;

					// Rehydrate numbers from uint to float
					const posX = (d[i + 1] - MIDDLE) * INVERSE_SCALE;
					const posY = (d[i + 2] - MIDDLE) * INVERSE_SCALE;
					const posZ = (d[i + 3] - MIDDLE) * INVERSE_SCALE;
					const rotX = (d[i + 4] - MIDDLE) * INVERSE_SCALE;
					const rotY = (d[i + 5] - MIDDLE) * INVERSE_SCALE;
					const rotZ = (d[i + 6] - MIDDLE) * INVERSE_SCALE;
					const misc = d[i + 7];
					let avatar;

					if (!avatars.has(id)) {
						avatar = makeAvatarEl(id);
						console.log('Creating new Avatar', id);
						avatars.set(id, avatar);

						// seperating the xz and y rotations allow us to rotate the shadow in place on the floor
						avatar.setAttribute('position', `${posX} ${posY} ${posZ}`);
						avatar.setAttribute('rotation', `0 ${rotY * RAD2DEG} 0`);
						avatar.firstChild.setAttribute('rotation', `${rotX * RAD2DEG} 0 ${rotZ * RAD2DEG}`);
						avatarContainer.appendChild(avatar);
					} else {
						// update existing avatar
						avatar = avatars.get(id);
						if (avatar.object3D) {

							// seperating the xz and y rotations allow us to rotate the shadow in place on the floor
							avatar.firstChild.object3D.rotation.x = rotX;
							avatar.object3D.rotation.y = rotY;
							avatar.firstChild.object3D.rotation.z = rotZ;
							avatar.object3D.position.x = posX;
							avatar.object3D.position.y = posY;
							avatar.object3D.position.z = posZ;
						}
					}

					if (Number(avatar.dataset.misc || 0) !== misc) {
						if (getMiscState(misc, 'speaker')) {
							addCrown(avatar);
							avatar.setAttribute('scale', '1.5 1.5 1.5');
							avatar.querySelector('.shadow').setAttribute('scale', '1.5 1.5 1.5');
						}
						avatar.dataset.misc = misc;
					}
				}

				tickOff.forEach(function (id) {
					const a = avatars.get(id);
					a.emit('remove');
					avatars.delete(id);
					setTimeout(function () {
						avatarContainer.removeChild(a);
					}, 2000);
				});
			}
		});
	},

	tick: function () {
		if (this.sceneEl.camera) {
			this.updateState({
				rotation: this.sceneEl.camera.parent.rotation,
				position: this.sceneEl.camera.parent.position
			});
		}
	},

	// toggle values in the boolean number
	setMiscState: function setMiscState (name, bool) {
		if (!miscMap[name]) throw Error('No field ' + name);
		state[7] = bool ? (state[7] | miscMap[name]) : (state[7] & ~ miscMap[name]);
	},

	updateState: function updateState({
		id,
		position,
		rotation
	} = {}) {
		if (id) {
			console.log('ID recieved from server:' + id);
			state[0] = id;

			// Init camera position
			if (mode === 'guest') {
				setPosition(this.sceneEl.querySelector('a-camera'), id);
				this.sceneEl.querySelector('a-camera').setAttribute('rotation', '0 180 0');
			}

			if (mode === 'speaker') {
				this.sceneEl.querySelector('a-camera').setAttribute('position', '3 2.2 0');
				this.setMiscState('speaker', true);
			}
		}
		if (position) state[1] = Math.floor((position.x * SCALE) + MIDDLE);
		if (position) state[2] = Math.floor((position.y * SCALE) + MIDDLE);
		if (position) state[3] = Math.floor((position.z * SCALE) + MIDDLE);
		if (rotation) state[4] = Math.floor((rotation.x * SCALE) + MIDDLE);
		if (rotation) state[5] = Math.floor((rotation.y * SCALE) + MIDDLE);
		if (rotation) state[6] = Math.floor((rotation.z * SCALE) + MIDDLE);
		if (this.webSocket.readyState === 1) this.webSocket.send(state);
	}
});

const avatarGen = color => `
<a-entity><a-entity>
	<a-animation attribute="scale" from="0 0 0" fill="backwards" to="1 1 1" dur="2300" easing="ease-out-elastic" delay="1000"></a-animation>
	<a-animation attribute="scale" to="0 0 0" from="1 1 1" dur="1800" easing="ease-in-elastic" begin="remove"></a-animation>
	<a-box material="color: ${color};" scale="" class="avatar-body"></a-box>
	<a-entity position="0.25 0 -0.5" geometry="primitive: sphere; radius: 0.2;" material="shader: standard; color: white; sphericalEnvMap: #sky; metalness: 0.3; roughness:0.6;"></a-entity>
	<a-entity position="-0.25 0 -0.5" geometry="primitive: sphere; radius: 0.2;" material="shader: standard; color: white; sphericalEnvMap: #sky; metalness: 0.3; roughness:0.6;"></a-entity>
	<a-entity class="flap" position="0 -0.6 0.5" rotation="-10 0 0">
		<a-box material="color: ${color};" class="avatar-mouth" position="0 0 -0.5" scale="1 0.2 1">
			<a-box material="color: red;" position="0 0.6 0" scale="0.8 0.2 0.8"></a-box>
		</a-box>
		<a-animation attribute="rotation" fill="both" to="-20 0 0" from="-10 0 0" dur="68" count="2" direction="alternate" begin="talk"></a-animation>
	</a-entity>
	<a-sphere position="0 0 0" scale="0 0 0" class="avatar-boom" material="color: ${color}; shader: flat; transparent: true;">
		<a-animation fill="none" attribute="scale" to="20 20 20" dur="4000"></a-animation>
		<a-animation attribute="material.opacity" to="0" dur="3000"></a-animation>
	</a-sphere>
	<a-sphere position="0 0 0" scale="0 0 0" class="avatar-boom" material="color: ${color}; side: back; shader: flat; transparent: true;">
		<a-animation fill="none" attribute="scale" to="20 20 20" dur="4000" delay="0.3"></a-animation>
		<a-animation attribute="material.opacity" to="0" dur="3000" delay="0.3"></a-animation>
	</a-sphere>
</a-entity>
<a-entity geometry="primitive: plane;" class="shadow" place-on-ground rotation="-90 0 0" material="shader: flat; src: #shadow; transparent: true; opacity: 0.4;"></a-entity>
</a-entity>`;

function makeAvatarEl(id) {
	return document.createRange().createContextualFragment(avatarGen('hsl(' + (id * 137.5) % 360 + ',80%,60%)')).firstElementChild;
}

function addCrown(el) {
	el.querySelector('.avatar-body').appendChild(document.createRange().createContextualFragment(`
		<a-entity obj-model="obj: #crown;" position="0.31 0.51 0.17" scale="0.8 0.8 0.8" material="color: #ffc800;; sphericalEnvMap: #sky; metalness: 0.8; roughness:0.3;" rotation="4 -0.5 -9"></a-entity>
	`).firstElementChild);
}

// for (let id = 0; id < 100; id++) {
// 	const avatar = makeAvatarEl(id);
// 	setPosition(avatar, id);
// 	avatarContainer.appendChild(avatar);
// }

AFRAME.registerComponent('place-on-ground', {
	schema: {},
	tick () {
		this.el.object3D.position.y -= this.el.object3D.getWorldPosition().y;
	}
});
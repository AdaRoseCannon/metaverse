/* eslint-env es6 */
/* eslint no-console: 0 */

const constants = {
	SYNC_INTERVAL: 32
};

(function(global) {

	const AFRAME = global.AFRAME;
	const length = 8;
	const SCALE = 512; //for storing decimal as Uint
	const INVERSE_SCALE = 1 / SCALE;
	const MIDDLE = Math.pow(2, 15); //for storing negatives as Uint
	const RAD2DEG = 180 / Math.PI;
	const state = new Uint16Array(length);
	const handshakeReg = /^HANDSHAKE:(.+)/;
	const stage = document.getElementById('stage');
	const avatarContainer = document.getElementById('avatar-container');
	const cameraWrapper = document.getElementById('camera-wrapper');
	const ws = window.webSocketConnection;
	const mode = (location.search === '?speaker' && 'speaker') ||
		(location.search === '?watcher' && 'watcher') ||
		'guest';

	if (mode !== 'watcher') {
		document.querySelector('a-scene').setAttribute('avatar-sync', 'enabled: true;');
	}

	// Socket data format
	// 0 id
	// 1-3 position
	// 3-6 rotation
	// 7   misc

	const miscMap = {
		'speaker': 1,
		'celebrate': 2,
		'talk': 4,
		'example3': 8,
		'example4': 16,
		'example5': 32,
		'example6': 64,
		'example7': 128
	}

	function getMiscState(miscState, name) {
		if (!miscMap[name]) throw Error('No field ' + name);
		return !!(miscState & miscMap[name]);
	}

	function getMiscChanged(a,b) {
		const keys = Object.keys(miscMap);
		const diff = a ^ b;
		return keys.filter(function (key) {
			return diff & miscMap[key];
		});
	}

	AFRAME.registerSystem('avatar-sync', {
		schema: {
			enabled: {
				default: false
			}
		},
		init: function() {
			if (!this.data.enabled) return;

			setInterval(() => {
				if (!this.data.enabled) return;

				// only update if data is being sent
				if (this.webSocket.bufferedAmount !== 0) return;

				// Only update if it has an id
				if (this.sceneEl.camera && state[0]) {
					this.updateState({
						rotation: this.sceneEl.camera.el.object3D.getWorldRotation(),
						position: this.sceneEl.camera.el.object3D.getWorldPosition()
					});
				}
			}, constants.SYNC_INTERVAL);

			const celebrate = () => {
				this.setMiscState('celebrate', true);
				setTimeout(() => {
					this.setMiscState('celebrate', false);
				}, 500);
			}

			window.addEventListener('touchstart', celebrate);
			window.addEventListener('mousedown', celebrate);

			const self = this;
			this.webSocket = ws;

			const avatars = new Map();

			stage.addEventListener('environment-update', function() {

				// trigger id update to update position
				self.updateState({ id: state[0] });

				// for (let id = 0; id < 300; id++) {
				// 	const avatar = makeAvatarEl(id);
				// 	stage.components.environment.setPosition(avatar, 'guest', id);
				// 	avatar.firstElementChild.setAttribute('position', '0 0.2 0');
				// 	avatar.setAttribute('rotation', '0 180 0');
				// 	avatarContainer.appendChild(avatar);
				// }
			});

			ws.addEventListener('message', function m(e) {
				if (typeof e.data === 'string' && e.data.match(handshakeReg)) {
					self.updateState({ id: Number(e.data.match(handshakeReg)[1]) });
					return console.log('Connected');
				} else {

					// handle byte data
					if (!e.data.byteLength) return;
					const d = new Uint16Array(e.data);
					const tickOff = new Set(avatars.keys());
					const count = d.length/length;
					if (count !== this.count) {
						const counter = document.getElementById('counter');
						if (counter) {
							counter.setAttribute('text-geometry', 'value', count);
							this.count = count;
						}
					}

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
							avatar.avatarBody = avatar.firstElementChild;
							console.log('Creating new Avatar', id);

							avatars.set(id, avatar);

							avatarContainer.appendChild(avatar);
						} else {
							avatar = avatars.get(id);
						}

						const oldMisc = Number(avatar.dataset.misc || 0);
						if (oldMisc !== misc) {
							const changed = getMiscChanged(oldMisc, misc);
							if (changed.includes('speaker') && getMiscState(misc, 'speaker')) {
								avatar.avatarBody.removeAttribute('clone');
								avatar.avatarBody.insertAdjacentHTML('afterbegin', '<a-entity obj-model="obj: #ada-obj; mtl: #ada-mtl" ada-model scale="1.5 1.5 1.5" shadow="receive: false;"></a-entity>');
							}
							if (changed.includes('celebrate') && getMiscState(misc, 'celebrate')) {
								avatar.avatarBody.emit('celebrate');
							}
							avatar.dataset.misc = misc;
						}

						avatar.setAttribute('rotation', `${-rotX * RAD2DEG} ${rotY * RAD2DEG + 180} ${rotZ * RAD2DEG}`);
						avatar.setAttribute('position', `${posX} ${posY + Math.random() * 0.0001} ${posZ}`);
					}

					// any not accounted for need to be removed
					tickOff.forEach(function(id) {
						const a = avatars.get(id);
						a.emit('remove');
						avatars.delete(id);
						setTimeout(function() {
							avatarContainer.removeChild(a);
						}, 2000);
					});
				}
			});
		},

		// toggle values in the boolean number
		setMiscState: function setMiscState(name, bool) {
			if (!miscMap[name]) throw Error('No field ' + name);
			state[7] = bool ? (state[7] | miscMap[name]) : (state[7] & ~miscMap[name]);
		},

		updateState: function updateState({
			id = null,
			position = null,
			rotation = null
		} = {}) {
			if (id) {
				console.log('ID recieved from server:' + id);
				state[0] = id;

				if (stage.components.environment) {
					stage.components.environment.setPosition(cameraWrapper, mode, id);
				}

				if (mode === 'speaker') {
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

	const avatarTemplate = `<a-entity><a-entity clone="#avatar-clone-target" rotation="0 0 0" scale="0.4 0.4 0.4" position="0 -1.2 -0.5">
		<a-animation attribute="rotation" from="0 -720 0" to="0 0 0"    fill="none" dur="2300" easing="ease-out-elastic" delay="1000"></a-animation>
		<a-animation attribute="scale"    from="0 0 0" to="0.4 0.4 0.4" fill="none" dur="2300" easing="ease-out-elastic" delay="1000"></a-animation>
		<a-animation attribute="scale"    to="0 0 0"                    fill="forwards" dur="1800" easing="ease-in-elastic"  begin="remove"></a-animation>
		<a-animation attribute="scale"    from="0.4 0.4 0.4" to="0.6 0.6 0.6" dur="300" easing="ease-out"  begin="celebrate"></a-animation>
		<a-animation attribute="scale"    to="0.4 0.4 0.4"  from="0.6 0.6 0.6" delay="350" dur="300" easing="ease-out" begin="celebrate"></a-animation>
	</a-entity></a-entity>`;

	function makeAvatarEl(id) {
		const el = document.createRange().createContextualFragment(avatarTemplate).firstElementChild;
		el.addEventListener('model-loaded', function () {
			const clone = el.firstElementChild.getObject3D('clone');
			if (!clone) return;

			const mask = clone.children[0];
			mask.material = mask.material.clone();
			mask.material.color.set('hsl(' + (id * 137.5) % 360 + ',80%,60%)');

			const hood = clone.children[1];
			hood.material = hood.material.clone();
			hood.material.color.set('hsl(' + (id * 137.5 + 100) % 360 + ',80%,60%)');
		});
		return el;
	}
}(this || window));

// var points = [];
// window.addEventListener('click', function (event) {
// 	var raycaster = new THREE.Raycaster();
// 	var mouse = new THREE.Vector2();
// 	mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
// 	mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;
// 	var scene = document.querySelector('a-scene');
// 	var camera = scene.camera;

// 	// update the picking ray with the camera and mouse position
// 	raycaster.setFromCamera(mouse, camera);

// 	// calculate objects intersecting the picking ray
// 	var intersects = raycaster.intersectObject(document.querySelector('#floor').object3D, true);

// 	if (intersects[0]) {
// 		const p = intersects[0].point;
// 		scene.insertAdjacentHTML('afterbegin', `<a-sphere position="${p.x} ${p.y} ${p.z}"></a-sphere>`)
// 		points.push(p.x);
// 		points.push(p.y);
// 		points.push(p.z);
// 		console.log(points);
// 		console.log(points.length/3);
// 	}
// })
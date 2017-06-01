/* global AFRAME, THREE */
/* eslint no-var: 0 */

AFRAME.registerComponent('ada-model', {
	schema: {
		mouth: {
			default: 0
		},
		eyes: {
			default: 0
		}
	},
	init: function() {
		this.el.addEventListener('model-loaded', function() {

			//Mouth 
			this.el.object3D.children[0].children[2].material.transparent = true;
			this.mouth = this.el.object3D.children[0].children[2];

			// Eyes
			this.el.object3D.children[0].children[1].material.transparent = true;
			this.eyes = this.el.object3D.children[0].children[1];

			// The glasses
			this.el.object3D.children[0].children[3].material.side = THREE.DoubleSide;

			// The head
			this.el.object3D.children[0].children[0].castShadow = true;
			this.el.object3D.children[0].children[0].material.needsUpdate = true;
			this.update();
		}.bind(this));
	},

	update: function() {
		if (this.mouth) this.mouth.material.map.offset.y = this.data.mouth / 7;
		if (this.eyes) this.eyes.material.map.offset.y = this.data.eyes / 4;
	}
});

AFRAME.registerComponent('student-model', {
	schema: {
		color1: {
			type: 'color',
			default: 'random'
		},
		color2: {
			type: 'color',
			default: 'random'
		}
	},
	init: function() {
		this.el.addEventListener('model-loaded', function() {
			this.hasLoaded = true;
			this.update();
		}.bind(this));
	},
	update: function() {
		if (this.data.color1 === 'random') {
			this.data.color1 = 'hsl(' + Math.random() * 360 + ', 100%, 60%)';
		}
		if (this.data.color2 === 'random') {
			this.data.color2 = 'hsl(' + Math.random() * 360 + ', 100%, 80%)';
		}
		if (this.hasLoaded) {
			this.el.object3D.children[0].children[0].material.color = new THREE.Color(this.data.color1);
			this.el.object3D.children[0].children[1].material.color = new THREE.Color(this.data.color2);
		}
	}
});

AFRAME.registerComponent('place-on-ground', {
	schema: {
		floor: {
			type: 'string'
		},
		height: {
			default: 0
		}
	},
	init: function () {
		this.dir = new THREE.Vector3(0, -1, 0);
	},
	update: function () {
		this.floors = 
		Array.from(document.querySelectorAll(this.data.floor))
		.map(function (a) {
			return a.object3D;
		})
		.filter(function (a) {
			return !!a;
		});
		this.rayCaster = new THREE.Raycaster(this.el.object3D.getWorldPosition(), this.dir, 0, 1000);
	},
	tick: function() {
		var offset = 10;
		var origin = this.el.object3D.getWorldPosition();
		origin.y += offset;
		this.rayCaster.set(origin, this.dir);

		var pos = this.el.getAttribute('position') || this.el.object3D.position;
		try {
			var result = this.rayCaster.intersectObjects(this.floors, true);
		} catch (e) {
			// sometimes it fails whilst the obj is loading
		}
		if (result && result[0]) {
			pos.y -= Math.max(result[0].distance - offset, 0.1);
			pos.y += this.data.height;
			this.el.object3D.position.set(pos.x, pos.y, pos.z);
			this.el.setAttribute('position', pos);
		}
	}
});
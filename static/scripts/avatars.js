
/* global AFRAME, THREE */

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
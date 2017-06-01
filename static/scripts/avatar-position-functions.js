/* eslint no-var: 0 */
'use strict';

var stage = document.getElementById('stage');
var scene = document.querySelector('a-scene');

scene.addEventListener('loaded', function () {
	var RAD2DEG = 180 / Math.PI;
	var registerPositionFn = stage.components.environment.registerPositionFn;

	function cylindricalToCartesian(phi, h, r) {
		return {
			x: r * Math.cos(phi),
			y: h,
			z: r * Math.sin(phi)
		};
	}

	// for setting the camera positions on the stage layout
	registerPositionFn('environment-stage', function stage(el, mode, id) {

		const cols = 12;
		const angle = 12;
		const row = Math.floor(id / cols);

		// radians
		const pos = cylindricalToCartesian(
			(220 + (id % cols) * angle) / RAD2DEG,
			0.4 + row * 2,
			(5 + row) * 2
		);

		if (mode === 'guest') {
			el.setAttribute('position', `${pos.x} ${pos.y} ${pos.z}`);
			el.setAttribute('rotation', '0 180 0');
		}
		if (mode === 'speaker') {
			el.setAttribute('position', '3 0 0');
		}
	});

	// for setting the camera positions on the desert layout
	registerPositionFn('environment-desert', function (el, mode, id) {
		el.setAttribute('position', '3 0 0');
	});
});
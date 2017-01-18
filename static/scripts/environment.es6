/* eslint-env es6 */
/* eslint no-console: 0 */

'use strict';

const startingPositions = {};
function registerPositionFn(name, fn) {
	startingPositions[name] = fn;
	this.update();
}
window.AFRAME.registerComponent('environment', {
	schema: {
		default : ''
	},
	init() {
		this.registerPositionFn = registerPositionFn.bind(this);
	},
	update() {
		if (!this.data) {
			this.el.innerHTML = '';
			return;
		}
		const content = document.getElementById(this.data);
		if (content) {

			// get script contents or innerHTML
			this.el.innerHTML = content.text || content.innerHTML;
		}

		// Update the component's setPosition function to allow listeners to use it
		this.setPosition = startingPositions[this.data] || function () { };

		this.el.emit('environment-update');
	}
});
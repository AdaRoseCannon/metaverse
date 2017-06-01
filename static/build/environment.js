/* eslint-env es6 */
/* eslint no-console: 0 */

'use strict';

var startingPositions = {};
function registerPositionFn(name, fn) {
	startingPositions[name] = fn;
	this.update();
}
window.AFRAME.registerComponent('environment', {
	schema: {
		default: ''
	},
	init: function init() {
		this.registerPositionFn = registerPositionFn.bind(this);
	},
	update: function update() {
		if (!this.data) {
			this.el.innerHTML = '';
			return;
		}
		var content = document.getElementById(this.data);
		if (content) {

			// get script contents or innerHTML
			this.el.innerHTML = content.text || content.innerHTML;
		}

		// Update the component's setPosition function to allow listeners to use it
		this.setPosition = startingPositions[this.data] || function () {};

		Array.from(document.querySelectorAll('[update-on-environment]')).forEach(function (el) {
			Object.keys(el.components).forEach(function (component) {
				el.components[component].update(el.components[component].data);
			});
		});

		this.el.emit('environment-update');
	}
});
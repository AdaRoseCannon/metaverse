/* eslint no-var: 0 */
/* eslint-env es6 */

'use strict';

const ws = window.webSocketConnection;
window.currentSlideHTML = '';

ws.addEventListener('message', function m(e) {
	if (typeof e.data !== 'string') return;

	const contentHoles = Array.from(document.querySelectorAll('.slide-target'));
	const textHoles = Array.from(document.querySelectorAll('.slide-text-target'));
	const sky = document.querySelector('a-sky');
	const stage = document.getElementById('stage');

	let data;

	data = e.data.match(/^SLIDE:([\s\S]+)/);
	if (data) {
		for (const contentHole of contentHoles) contentHole.innerHTML = data[1];
		for (const textHole of textHoles) textHole.textContent = data[1];
		window.currentSlideHTML = data[1];
		return;
	};

	data = e.data.match(/^SLIDE:(.+)<=([\s\S]+)/);
	if (data) {
		for (const contentHole of contentHoles) contentHole.querySelector(data[1]).innerHTML = data[2];
		window.currentSlideHTML = contentHoles[0].innerHTML;
		return;
	};

	data = e.data.match(/^ENVIRONMENT:([\s\S]+)/);
	if (data) {
		if (stage) stage.setAttribute('environment', data[1]);
		return;
	};

	data = e.data.match(/^APPEND:([\s\S]+)/);
	if (data) {
		for (const contentHole of contentHoles) {
			contentHole.insertAdjacentHTML('beforeend', data[1]);
		}
		for (const textHole of textHoles) textHole.textContent += data[1];
		window.currentSlideHTML += data;
		return;
	};

	data = e.data.match(/^SKY:([\s\S]+)/);
	if (data && sky) {
		sky.setAttribute('material', `src: ${data[1]}; fog: false; depthTest: false; shader: flat;`);
	};
});

window.addEventListener('DOMContentLoaded', function () {
	var stage = document.getElementById('stage');
	if (stage) stage.addEventListener('environment-update', function () {
		const contentHoles = Array.from(document.querySelectorAll('.slide-target'));
		for (const contentHole of contentHoles) contentHole.innerHTML = window.currentSlideHTML;
	});
});

/**
 * If in the editor
 */
if (document.getElementById('code')) (function () {
	var editor;
	window.onload = function() {
		editor = window.CodeMirror(
			document.getElementById('code'),
			{ mode: 'text/html',
				extraKeys: {'Ctrl-Space': 'autocomplete', 'Ctrl-Enter': submit},
				lineNumbers: true,
				value: ''
			}
		);
		editor.getDoc().setValue(window.currentSlideHTML || datums[select.value]);
	};

	function submit() {
		ws.send('SLIDE:' + editor.getValue());
	}

	function append() {
		ws.send('APPEND:' + editor.getValue());
	}

	const select = document.querySelector('#snippets');
	const snips = select.querySelectorAll('script');
	const datums = {};
	for (const o of snips) {
		datums[o.id] = o.text.trim();
		select.removeChild(o);
		const option = document.createElement('option');
		option.textContent = o.id;
		option.value = o.id;
		select.appendChild(option);
	}

	select.addEventListener('change', function () {
		editor.getDoc().setValue(datums[select.value]);
	});

	const skyBoxSelect = document.getElementById('set-sky');
	skyBoxSelect.addEventListener('change', function () {
		ws.send('SKY:' + skyBoxSelect.value)
	});

	const environmentSelect = document.getElementById('set-environment');
	environmentSelect.addEventListener('change', function () {
		ws.send('ENVIRONMENT:' + environmentSelect.value)
	});

	document.getElementById('submit').addEventListener('click', function () {
		submit();
	});

	document.getElementById('append').addEventListener('click', function () {
		append();
	});
} ());
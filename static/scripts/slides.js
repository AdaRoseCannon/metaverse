/* eslint no-var: 0 */
/* eslint-env es6 */

'use strict';

var ws = new WebSocket((location.hostname === 'localhost' ? 'ws://' : 'wss://') + location.host);
ws.binaryType = 'arraybuffer';

var contentHoles = Array.from(document.querySelectorAll('.slide-target'));
var textHoles = Array.from(document.querySelectorAll('.slide-text-target'));

ws.addEventListener('message', function m(e) {
	if (typeof e.data !== 'string') return;

	var data;

	data = e.data.match(/^SLIDE:([\s\S]+)/);
	if (data) {
		for (const contentHole of contentHoles) contentHole.innerHTML = data[1];
		for (const textHole of textHoles) textHole.textContent = data[1];
		return;
	};

	data = e.data.match(/^SLIDE:(.+)<=([\s\S]+)/);
	if (data) {
		for (const contentHole of contentHoles) contentHole.querySelector(data[1]).innerHTML = data[2];
		return;
	};

	data = e.data.match(/^APPEND:([\s\S]+)/);
	if (data) {
		for (const contentHole of contentHoles) {
			const result = document.createRange().createContextualFragment(data[1]);
			while (result.firstElementChild) contentHole.appendChild(result.firstElementChild);
		}
		for (const textHole of textHoles) textHole.textContent += data[1];
		return;
	};
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
		editor.getDoc().setValue(datums[select.value]);
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

	document.getElementById('submit').addEventListener('click', function () {
		submit();
	});

	document.getElementById('append').addEventListener('click', function () {
		append();
	});
} ());
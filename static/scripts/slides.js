/* eslint no-var: 0 */
/* eslint-env es6 */

'use strict';

var ws = new WebSocket((location.hostname === 'localhost' ? 'ws://' : 'wss://') + location.host);
ws.binaryType = 'arraybuffer';

var slideReg = /SLIDE:([\s\S]+)/;
var slideUpdateReg = /SLIDE:(.+)<=([\s\S]+)/;
var contentHole = document.getElementById('dynamic-content');

ws.addEventListener('message', function m(e) {
	if (typeof e.data !== 'string') return;

	var data;

	data = e.data.match(slideReg);
	if (data) {
		if (contentHole) contentHole.innerHTML = data[1];
	};

	data = e.data.match(slideUpdateReg);
	if (data) {
		if (contentHole) contentHole.querySelector(data[1]).innerHTML = data[2];
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
} ());
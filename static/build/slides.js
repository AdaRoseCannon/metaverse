/* eslint no-var: 0 */
/* eslint-env es6 */

'use strict';

var ws = new WebSocket((location.hostname === 'localhost' ? 'ws://' : 'wss://') + location.host);
ws.binaryType = 'arraybuffer';

ws.addEventListener('message', function m(e) {
	if (typeof e.data !== 'string') return;

	var contentHoles = Array.from(document.querySelectorAll('.slide-target'));
	var textHoles = Array.from(document.querySelectorAll('.slide-text-target'));
	var sky = document.querySelector('a-sky');
	var stage = document.getElementById('stage');

	var data = void 0;

	data = e.data.match(/^SLIDE:([\s\S]+)/);
	if (data) {
		var _iteratorNormalCompletion = true;
		var _didIteratorError = false;
		var _iteratorError = undefined;

		try {
			for (var _iterator = contentHoles[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
				var contentHole = _step.value;
				contentHole.innerHTML = data[1];
			}
		} catch (err) {
			_didIteratorError = true;
			_iteratorError = err;
		} finally {
			try {
				if (!_iteratorNormalCompletion && _iterator.return) {
					_iterator.return();
				}
			} finally {
				if (_didIteratorError) {
					throw _iteratorError;
				}
			}
		}

		var _iteratorNormalCompletion2 = true;
		var _didIteratorError2 = false;
		var _iteratorError2 = undefined;

		try {
			for (var _iterator2 = textHoles[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
				var textHole = _step2.value;
				textHole.textContent = data[1];
			}
		} catch (err) {
			_didIteratorError2 = true;
			_iteratorError2 = err;
		} finally {
			try {
				if (!_iteratorNormalCompletion2 && _iterator2.return) {
					_iterator2.return();
				}
			} finally {
				if (_didIteratorError2) {
					throw _iteratorError2;
				}
			}
		}

		return;
	};

	data = e.data.match(/^SLIDE:(.+)<=([\s\S]+)/);
	if (data) {
		var _iteratorNormalCompletion3 = true;
		var _didIteratorError3 = false;
		var _iteratorError3 = undefined;

		try {
			for (var _iterator3 = contentHoles[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
				var _contentHole = _step3.value;
				_contentHole.querySelector(data[1]).innerHTML = data[2];
			}
		} catch (err) {
			_didIteratorError3 = true;
			_iteratorError3 = err;
		} finally {
			try {
				if (!_iteratorNormalCompletion3 && _iterator3.return) {
					_iterator3.return();
				}
			} finally {
				if (_didIteratorError3) {
					throw _iteratorError3;
				}
			}
		}

		return;
	};

	data = e.data.match(/^ENVIRONMENT:([\s\S]+)/);
	if (data) {
		if (stage) stage.setAttribute('environment', data[1]);
		return;
	};

	data = e.data.match(/^APPEND:([\s\S]+)/);
	if (data) {
		var _iteratorNormalCompletion4 = true;
		var _didIteratorError4 = false;
		var _iteratorError4 = undefined;

		try {
			for (var _iterator4 = contentHoles[Symbol.iterator](), _step4; !(_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done); _iteratorNormalCompletion4 = true) {
				var _contentHole2 = _step4.value;

				var result = document.createRange().createContextualFragment(data[1]);
				while (result.firstElementChild) {
					_contentHole2.appendChild(result.firstElementChild);
				}
			}
		} catch (err) {
			_didIteratorError4 = true;
			_iteratorError4 = err;
		} finally {
			try {
				if (!_iteratorNormalCompletion4 && _iterator4.return) {
					_iterator4.return();
				}
			} finally {
				if (_didIteratorError4) {
					throw _iteratorError4;
				}
			}
		}

		var _iteratorNormalCompletion5 = true;
		var _didIteratorError5 = false;
		var _iteratorError5 = undefined;

		try {
			for (var _iterator5 = textHoles[Symbol.iterator](), _step5; !(_iteratorNormalCompletion5 = (_step5 = _iterator5.next()).done); _iteratorNormalCompletion5 = true) {
				var _textHole = _step5.value;
				_textHole.textContent += data[1];
			}
		} catch (err) {
			_didIteratorError5 = true;
			_iteratorError5 = err;
		} finally {
			try {
				if (!_iteratorNormalCompletion5 && _iterator5.return) {
					_iterator5.return();
				}
			} finally {
				if (_didIteratorError5) {
					throw _iteratorError5;
				}
			}
		}

		return;
	};

	data = e.data.match(/^SKY:([\s\S]+)/);
	if (data && sky) {
		sky.setAttribute('material', 'src: ' + data[1] + '; fog: false; depthTest: false; shader: flat;');
	};
});

/**
 * If in the editor
 */
if (document.getElementById('code')) (function () {
	var editor;
	window.onload = function () {
		editor = window.CodeMirror(document.getElementById('code'), { mode: 'text/html',
			extraKeys: { 'Ctrl-Space': 'autocomplete', 'Ctrl-Enter': submit },
			lineNumbers: true,
			value: ''
		});
		editor.getDoc().setValue(datums[select.value]);
	};

	function submit() {
		ws.send('SLIDE:' + editor.getValue());
	}

	function append() {
		ws.send('APPEND:' + editor.getValue());
	}

	var select = document.querySelector('#snippets');
	var snips = select.querySelectorAll('script');
	var datums = {};
	var _iteratorNormalCompletion6 = true;
	var _didIteratorError6 = false;
	var _iteratorError6 = undefined;

	try {
		for (var _iterator6 = snips[Symbol.iterator](), _step6; !(_iteratorNormalCompletion6 = (_step6 = _iterator6.next()).done); _iteratorNormalCompletion6 = true) {
			var o = _step6.value;

			datums[o.id] = o.text.trim();
			select.removeChild(o);
			var option = document.createElement('option');
			option.textContent = o.id;
			option.value = o.id;
			select.appendChild(option);
		}
	} catch (err) {
		_didIteratorError6 = true;
		_iteratorError6 = err;
	} finally {
		try {
			if (!_iteratorNormalCompletion6 && _iterator6.return) {
				_iterator6.return();
			}
		} finally {
			if (_didIteratorError6) {
				throw _iteratorError6;
			}
		}
	}

	select.addEventListener('change', function () {
		editor.getDoc().setValue(datums[select.value]);
	});

	var skyBoxSelect = document.getElementById('set-sky');
	skyBoxSelect.addEventListener('change', function () {
		ws.send('SKY:' + skyBoxSelect.value);
	});

	var environmentSelect = document.getElementById('set-environment');
	environmentSelect.addEventListener('change', function () {
		ws.send('ENVIRONMENT:' + environmentSelect.value);
	});

	document.getElementById('submit').addEventListener('click', function () {
		submit();
	});

	document.getElementById('append').addEventListener('click', function () {
		append();
	});
})();
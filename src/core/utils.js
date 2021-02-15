export const getActiveColor = function (state) {
	const { $from, $to, $cursor } = state.selection;
	const { textColor } = state.schema.marks;

	// Filter out other marks
	let marks = [];
	if ($cursor) {
		marks.push(
			textColor.isInSet(state.storedMarks || $cursor.marks()) || undefined
		);

	}
	else {
		state.doc.nodesBetween($from.pos, $to.pos, currentNode => {
			if (currentNode.isLeaf) {
				const mark = textColor.isInSet(currentNode.marks) || undefined;
				marks.push(mark);
				return !mark;
			}
			return true;
		});
	}

	const marksWithColor = marks.filter(mark => !!mark);
	// When multiple colors are selected revert back to default color
	if (
		marksWithColor.length > 1 ||
		(marksWithColor.length === 1 && marks.length > 1)
	) {
		return null;
	}
	return marksWithColor.length
		? marksWithColor[0].attrs.color
		: 'default';
};

export const randomString = function (len, chars) {
	if (!chars) {
		chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
	}
	if (!len) {
		len = 8;
	}
	var randomstring = '';
	for (var i = 0; i < len; i++) {
		var rnum = Math.floor(Math.random() * chars.length);
		randomstring += chars.substring(rnum, rnum + 1);
	}
	return randomstring;
};

export function encodeObject(value) {
	if (typeof value !== 'object') {
		return null;
	}
	return encodeURIComponent(JSON.stringify(value));
}

export function decodeObject(value) {
	try {
		return JSON.parse(decodeURIComponent(value));
	}
	catch (e) {

	}

	return null;
}

export function debounce(func, wait, immediate) {
	var timeout;
	return function () {
		var context = this, args = arguments;
		var later = function () {
			timeout = null;
			if (!immediate) func.apply(context, args);
		};
		var callNow = immediate && !timeout;
		clearTimeout(timeout);
		timeout = setTimeout(later, wait);
		if (callNow) func.apply(context, args);
	};
}

// https://github.com/jashkenas/underscore/blob/master/underscore.js
// (c) 2009-2018 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
// Underscore may be freely distributed under the MIT license.
// Returns a function, that, when invoked, will only be triggered at most once
// during a given window of time. Normally, the throttled function will run
// as much as it can, without ever going more than once per `wait` duration;
// but if you'd like to disable the execution on the leading edge, pass
// `{leading: false}`. To disable execution on the trailing edge, ditto.
export function throttle(func, wait, options) {
	var context, args, result;
	var timeout = null;
	var previous = 0;
	if (!options) options = {};
	var later = function () {
		previous = options.leading === false ? 0 : Date.now();
		timeout = null;
		result = func.apply(context, args);
		if (!timeout) context = args = null;
	};
	return function () {
		var now = Date.now();
		if (!previous && options.leading === false) previous = now;
		var remaining = wait - (now - previous);
		context = this;
		args = arguments;
		if (remaining <= 0 || remaining > wait) {
			if (timeout) {
				clearTimeout(timeout);
				timeout = null;
			}
			previous = now;
			result = func.apply(context, args);
			if (!timeout) context = args = null;
		}
		else if (!timeout && options.trailing !== false) {
			timeout = setTimeout(later, remaining);
		}
		return result;
	};
}

/**
 * Calculates the Levenshtein distance between two strings
 * @type Number
 */
export function levenshtein(a, b) {
	var aLen = a.length;
	var bLen = b.length;

	var arr = new Array(aLen + 1);
	var i, j, cost;

	for (i = 0; i <= aLen; i++) {
		arr[i] = new Array(bLen);
		arr[i][0] = i;
	}

	for (j = 0; j <= bLen; j++) {
		arr[0][j] = j;
	}

	for (i = 1; i <= aLen; i++) {
		for (j = 1; j <= bLen; j++) {
			cost = (a[i - 1] == b[j - 1]) ? 0 : 1;
			arr[i][j] = Math.min(arr[i - 1][j] + 1, Math.min(arr[i][j - 1] + 1, arr[i - 1][j - 1] + cost));
		}
	}

	return arr[aLen][bLen];
}

import {
	findParentNode,
	findSelectedNodeOfType
} from 'prosemirror-utils'

export default function nodeIsActive(state, type, attrs = {}) {
	const predicate = node => node.type === type
	const node = findSelectedNodeOfType(type)(state.selection)
		|| findParentNode(predicate)(state.selection)

	if (!Object.keys(attrs).length || !node) {
		return !!node
	}

	return node.node.hasMarkup(type, { ...node.node.attrs, ...attrs })
}

// TODO: Move this somewhere else
const { Fragment, Slice } = require('prosemirror-model')
const { Step, StepResult } = require('prosemirror-transform')

// https://discuss.prosemirror.net/t/preventing-image-placeholder-replacement-from-being-undone/1394
export class SetAttrsStep extends Step {
	// :: (number, Object | null)
	constructor(pos, attrs) {
		super()
		this.pos = pos
		this.attrs = attrs
	}

	apply(doc) {
		let target = doc.nodeAt(this.pos)
		if (!target) return StepResult.fail('No node at given position')
		let newNode = target.type.create(this.attrs, Fragment.emtpy, target.marks)
		let slice = new Slice(Fragment.from(newNode), 0, target.isLeaf ? 0 : 1)
		return StepResult.fromReplace(doc, this.pos, this.pos + 1, slice)
	}

	invert(doc) {
		let target = doc.nodeAt(this.pos)
		return new SetAttrsStep(this.pos, target ? target.attrs : null)
	}

	map(mapping) {
		let pos = mapping.mapResult(this.pos, 1)
		return pos.deleted ? null : new SetAttrsStep(pos.pos, this.attrs)
	}

	toJSON() {
		return { stepType: 'setAttrs', pos: this.pos, attrs: this.attrs }
	}

	static fromJSON(schema, json) {
		if (typeof json.pos != 'number' || (json.attrs != null && typeof json.attrs != 'object'))
			throw new RangeError('Invalid input for SetAttrsStep.fromJSON')
		return new SetAttrsStep(json.pos, json.attrs)
	}
}

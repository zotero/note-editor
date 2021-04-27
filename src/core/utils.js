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
		state.doc.nodesBetween($from.pos, $to.pos, (currentNode) => {
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
		marksWithColor.length > 1
		|| (marksWithColor.length === 1 && marks.length > 1)
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

// https://stackoverflow.com/a/6713782
// Only used to compare JSON-ready data
export function basicDeepEqual(x, y) {
	if (x === y) return true;
	// if both x and y are null or undefined and exactly the same
	if (!(x instanceof Object) || !(y instanceof Object)) return false;
	// if they are not strictly equal, they both need to be Objects
	if (x.constructor !== y.constructor) return false;
	// they must have the exact same prototype chain, the closest we can do is
	// test there constructor.

	for (var p in x) {
		if (!x.hasOwnProperty(p)) continue;
		// other properties were tested using x.constructor === y.constructor
		if (!y.hasOwnProperty(p)) return false;
		// allows to compare x[ p ] and y[ p ] when set to undefined
		if (x[p] === y[p]) continue;
		// if they have the same strict value or identity then they are equal
		if (typeof (x[p]) !== 'object') return false;
		// Numbers, Strings, Functions, Booleans must be strictly equal
		if (!basicDeepEqual(x[p], y[p])) return false;
		// Objects and Arrays must be tested recursively
	}

	for (p in y) {
		if (y.hasOwnProperty(p) && !x.hasOwnProperty(p)) {
			// allows x[ p ] to be set to undefined
			return false;
		}
	}
	return true;
}


/**
 * Build citation item preview string (based on _buildBubbleString in quickFormat.js)
 */
export function formatCitationItem(citationItem) {
	const STARTSWITH_ROMANESQUE_REGEXP = /^[&a-zA-Z\u0e01-\u0e5b\u00c0-\u017f\u0370-\u03ff\u0400-\u052f\u0590-\u05d4\u05d6-\u05ff\u1f00-\u1fff\u0600-\u06ff\u200c\u200d\u200e\u0218\u0219\u021a\u021b\u202a-\u202e]/;
	const ENDSWITH_ROMANESQUE_REGEXP = /[.;:&a-zA-Z\u0e01-\u0e5b\u00c0-\u017f\u0370-\u03ff\u0400-\u052f\u0590-\u05d4\u05d6-\u05ff\u1f00-\u1fff\u0600-\u06ff\u200c\u200d\u200e\u0218\u0219\u021a\u021b\u202a-\u202e]$/;

	let { itemData } = citationItem;
	let str = '';

	if (!itemData) {
		return '';
	}

	// Authors
	let authors = itemData.author;
	if (authors) {
		if (authors.length === 1) {
			str = authors[0].family || authors[0].literal;
		}
		else if (authors.length === 2) {
			let a = authors[0].family || authors[0].literal;
			let b = authors[1].family || authors[1].literal;
			str = a + ' and ' + b;
		}
		else if (authors.length >= 3) {
			str = (authors[0].family || authors[0].literal) + ' et al.';
		}
	}

	// Title
	if (!str && itemData.title) {
		str = `“${itemData.title}”`;
	}

	// Date
	if (itemData.issued
		&& itemData.issued['date-parts']
		&& itemData.issued['date-parts'][0]) {
		let year = itemData.issued['date-parts'][0][0];
		if (year && year != '0000') {
			str += ', ' + year;
		}
	}

	// Locator
	if (citationItem.locator) {
		if (citationItem.label) {
			// TODO: Localize and use short forms
			var label = citationItem.label;
		}
		else if (/[\-–,]/.test(citationItem.locator)) {
			var label = 'pp.';
		}
		else {
			var label = 'p.';
		}

		str += ', ' + label + ' ' + citationItem.locator;
	}

	// Prefix
	if (citationItem.prefix && ENDSWITH_ROMANESQUE_REGEXP) {
		str = citationItem.prefix
			+ (ENDSWITH_ROMANESQUE_REGEXP.test(citationItem.prefix) ? ' ' : '')
			+ str;
	}

	// Suffix
	if (citationItem.suffix && STARTSWITH_ROMANESQUE_REGEXP) {
		str += (STARTSWITH_ROMANESQUE_REGEXP.test(citationItem.suffix) ? ' ' : '')
			+ citationItem.suffix;
	}

	return str;
}

export function formatCitation(citation) {
	return citation.citationItems.map(x => formatCitationItem(x)).join(';');
}


import {
	findParentNode,
	findSelectedNodeOfType
} from 'prosemirror-utils';

export default function nodeIsActive(state, type, attrs = {}) {
	const predicate = node => node.type === type;
	const node = findSelectedNodeOfType(type)(state.selection)
		|| findParentNode(predicate)(state.selection);

	if (!Object.keys(attrs).length || !node) {
		return !!node;
	}

	return node.node.hasMarkup(type, { ...node.node.attrs, ...attrs });
}

// TODO: Move this somewhere else
const { Fragment, Slice } = require('prosemirror-model');
const { Step, StepResult } = require('prosemirror-transform');

// https://discuss.prosemirror.net/t/preventing-image-placeholder-replacement-from-being-undone/1394
export class SetAttrsStep extends Step {
	// :: (number, Object | null)
	constructor(pos, attrs) {
		super();
		this.pos = pos;
		this.attrs = attrs;
	}

	apply(doc) {
		let target = doc.nodeAt(this.pos);
		if (!target) return StepResult.fail('No node at given position');
		let newNode = target.type.create(this.attrs, Fragment.emtpy, target.marks);
		let slice = new Slice(Fragment.from(newNode), 0, target.isLeaf ? 0 : 1);
		return StepResult.fromReplace(doc, this.pos, this.pos + 1, slice);
	}

	invert(doc) {
		let target = doc.nodeAt(this.pos);
		return new SetAttrsStep(this.pos, target ? target.attrs : null);
	}

	map(mapping) {
		let pos = mapping.mapResult(this.pos, 1);
		return pos.deleted ? null : new SetAttrsStep(pos.pos, this.attrs);
	}

	toJSON() {
		return { stepType: 'setAttrs', pos: this.pos, attrs: this.attrs };
	}

	static fromJSON(schema, json) {
		if (typeof json.pos != 'number' || (json.attrs != null && typeof json.attrs != 'object')) throw new RangeError('Invalid input for SetAttrsStep.fromJSON');
		return new SetAttrsStep(json.pos, json.attrs);
	}
}

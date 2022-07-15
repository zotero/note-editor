
// Work around firefox bug that stops up/down navigation in contenteditable to work
export function refocusEditor(callback) {
	let scrollTop = document.querySelector('.editor-core').scrollTop;
	let input = document.createElement('input');
	input.style.position = 'absolute';
	input.style.opacity = 0;
	document.body.append(input);
	input.focus();
	input.offsetTop;
	setTimeout(() => {
		document.querySelector('.primary-editor').focus();
		input.remove();
		document.querySelector('.editor-core').scrollTop = scrollTop;
		setTimeout(callback, 0);
	}, 0);
}

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
		return '';
	}
	return marksWithColor.length
		? marksWithColor[0].attrs.color
		: '';
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
			// TODO: Don't use global var
			str = a + ' ' + (window.localizedStrings['general.and'] || 'and') + ' ' + b;
		}
		else if (authors.length >= 3) {
			str = (authors[0].family || authors[0].literal) + ' ' + (window.localizedStrings['general.etAl'] || 'et al.');
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
	return citation.citationItems.map(x => formatCitationItem(x)).join('; ');
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
		let newNode = target.type.create(this.attrs, Fragment.empty, target.marks);
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

/**
 * Replaces accented characters in a string with ASCII equivalents, and maps to the original string
 *
 * The same function is derived from the one used in Zotero utilities
 *
 * @param {String} str
 *
 * @return {Array}
 *
 * From http://lehelk.com/2011/05/06/script-to-remove-diacritics/
 */
export function removeDiacritics(str) {
	let map = {
		'A':'A','Ⓐ':'A','Ａ':'A','À':'A','Á':'A','Â':'A','Ầ':'A','Ấ':'A','Ẫ':'A','Ẩ':'A','Ã':'A','Ā':'A','Ă':'A',
		'Ằ':'A','Ắ':'A','Ẵ':'A','Ẳ':'A','Ȧ':'A','Ǡ':'A','Ä':'A','Ǟ':'A','Ả':'A','Å':'A','Ǻ':'A','Ǎ':'A','Ȁ':'A',
		'Ȃ':'A','Ạ':'A','Ậ':'A','Ặ':'A','Ḁ':'A','Ą':'A','Ⱥ':'A','Ɐ':'A','Ꜳ':'AA','Æ':'AE','Ǽ':'AE','Ǣ':'AE',
		'Ꜵ':'AO','Ꜷ':'AU','Ꜹ':'AV','Ꜻ':'AV','Ꜽ':'AY','B':'B','Ⓑ':'B','Ｂ':'B','Ḃ':'B','Ḅ':'B','Ḇ':'B','Ƀ':'B',
		'Ƃ':'B','Ɓ':'B','C':'C','Ⓒ':'C','Ｃ':'C','Ć':'C','Ĉ':'C','Ċ':'C','Č':'C','Ç':'C','Ḉ':'C','Ƈ':'C','Ȼ':'C',
		'Ꜿ':'C','D':'D','Ⓓ':'D','Ｄ':'D','Ḋ':'D','Ď':'D','Ḍ':'D','Ḑ':'D','Ḓ':'D','Ḏ':'D','Đ':'D','Ƌ':'D','Ɗ':'D',
		'Ɖ':'D','Ꝺ':'D','Ǳ':'DZ','Ǆ':'DZ','ǲ':'Dz','ǅ':'Dz','E':'E','Ⓔ':'E','Ｅ':'E','È':'E','É':'E','Ê':'E','Ề':'E',
		'Ế':'E','Ễ':'E','Ể':'E','Ẽ':'E','Ē':'E','Ḕ':'E','Ḗ':'E','Ĕ':'E','Ė':'E','Ë':'E','Ẻ':'E','Ě':'E','Ȅ':'E','Ȇ':'E',
		'Ẹ':'E','Ệ':'E','Ȩ':'E','Ḝ':'E','Ę':'E','Ḙ':'E','Ḛ':'E','Ɛ':'E','Ǝ':'E','F':'F','Ⓕ':'F','Ｆ':'F','Ḟ':'F',
		'Ƒ':'F','Ꝼ':'F','G':'G','Ⓖ':'G','Ｇ':'G','Ǵ':'G','Ĝ':'G','Ḡ':'G','Ğ':'G','Ġ':'G','Ǧ':'G','Ģ':'G','Ǥ':'G',
		'Ɠ':'G','Ꞡ':'G','Ᵹ':'G','Ꝿ':'G','H':'H','Ⓗ':'H','Ｈ':'H','Ĥ':'H','Ḣ':'H','Ḧ':'H','Ȟ':'H','Ḥ':'H','Ḩ':'H',
		'Ḫ':'H','Ħ':'H','Ⱨ':'H','Ⱶ':'H','Ɥ':'H','I':'I','Ⓘ':'I','Ｉ':'I','Ì':'I','Í':'I','Î':'I','Ĩ':'I','Ī':'I',
		'Ĭ':'I','İ':'I','Ï':'I','Ḯ':'I','Ỉ':'I','Ǐ':'I','Ȉ':'I','Ȋ':'I','Ị':'I','Į':'I','Ḭ':'I','Ɨ':'I','J':'J',
		'Ⓙ':'J','Ｊ':'J','Ĵ':'J','Ɉ':'J','K':'K','Ⓚ':'K','Ｋ':'K','Ḱ':'K','Ǩ':'K','Ḳ':'K','Ķ':'K','Ḵ':'K','Ƙ':'K',
		'Ⱪ':'K','Ꝁ':'K','Ꝃ':'K','Ꝅ':'K','Ꞣ':'K','L':'L','Ⓛ':'L','Ｌ':'L','Ŀ':'L','Ĺ':'L','Ľ':'L','Ḷ':'L','Ḹ':'L',
		'Ļ':'L','Ḽ':'L','Ḻ':'L','Ł':'L','Ƚ':'L','Ɫ':'L','Ⱡ':'L','Ꝉ':'L','Ꝇ':'L','Ꞁ':'L','Ǉ':'LJ','ǈ':'Lj','M':'M',
		'Ⓜ':'M','Ｍ':'M','Ḿ':'M','Ṁ':'M','Ṃ':'M','Ɱ':'M','Ɯ':'M','N':'N','Ⓝ':'N','Ｎ':'N','Ǹ':'N','Ń':'N','Ñ':'N',
		'Ṅ':'N','Ň':'N','Ṇ':'N','Ņ':'N','Ṋ':'N','Ṉ':'N','Ƞ':'N','Ɲ':'N','Ꞑ':'N','Ꞥ':'N','Ǌ':'NJ','ǋ':'Nj','O':'O',
		'Ⓞ':'O','Ｏ':'O','Ò':'O','Ó':'O','Ô':'O','Ồ':'O','Ố':'O','Ỗ':'O','Ổ':'O','Õ':'O','Ṍ':'O','Ȭ':'O','Ṏ':'O',
		'Ō':'O','Ṑ':'O','Ṓ':'O','Ŏ':'O','Ȯ':'O','Ȱ':'O','Ö':'O','Ȫ':'O','Ỏ':'O','Ő':'O','Ǒ':'O','Ȍ':'O','Ȏ':'O',
		'Ơ':'O','Ờ':'O','Ớ':'O','Ỡ':'O','Ở':'O','Ợ':'O','Ọ':'O','Ộ':'O','Ǫ':'O','Ǭ':'O','Ø':'O','Ǿ':'O','Ɔ':'O',
		'Ɵ':'O','Ꝋ':'O','Ꝍ':'O','Œ':'OE','Ƣ':'OI','Ꝏ':'OO','Ȣ':'OU','P':'P','Ⓟ':'P','Ｐ':'P','Ṕ':'P','Ṗ':'P',
		'Ƥ':'P','Ᵽ':'P','Ꝑ':'P','Ꝓ':'P','Ꝕ':'P','Q':'Q','Ⓠ':'Q','Ｑ':'Q','Ꝗ':'Q','Ꝙ':'Q','Ɋ':'Q','R':'R','Ⓡ':'R',
		'Ｒ':'R','Ŕ':'R','Ṙ':'R','Ř':'R','Ȑ':'R','Ȓ':'R','Ṛ':'R','Ṝ':'R','Ŗ':'R','Ṟ':'R','Ɍ':'R','Ɽ':'R','Ꝛ':'R',
		'Ꞧ':'R','Ꞃ':'R','S':'S','Ⓢ':'S','Ｓ':'S','ẞ':'S','Ś':'S','Ṥ':'S','Ŝ':'S','Ṡ':'S','Š':'S','Ṧ':'S','Ṣ':'S',
		'Ṩ':'S','Ș':'S','Ş':'S','Ȿ':'S','Ꞩ':'S','Ꞅ':'S','T':'T','Ⓣ':'T','Ｔ':'T','Ṫ':'T','Ť':'T','Ṭ':'T','Ț':'T',
		'Ţ':'T','Ṱ':'T','Ṯ':'T','Ŧ':'T','Ƭ':'T','Ʈ':'T','Ⱦ':'T','Ꞇ':'T','Ꜩ':'TZ','U':'U','Ⓤ':'U','Ｕ':'U','Ù':'U',
		'Ú':'U','Û':'U','Ũ':'U','Ṹ':'U','Ū':'U','Ṻ':'U','Ŭ':'U','Ü':'U','Ǜ':'U','Ǘ':'U','Ǖ':'U','Ǚ':'U','Ủ':'U',
		'Ů':'U','Ű':'U','Ǔ':'U','Ȕ':'U','Ȗ':'U','Ư':'U','Ừ':'U','Ứ':'U','Ữ':'U','Ử':'U','Ự':'U','Ụ':'U','Ṳ':'U',
		'Ų':'U','Ṷ':'U','Ṵ':'U','Ʉ':'U','V':'V','Ⓥ':'V','Ｖ':'V','Ṽ':'V','Ṿ':'V','Ʋ':'V','Ꝟ':'V','Ʌ':'V','Ꝡ':'VY',
		'W':'W','Ⓦ':'W','Ｗ':'W','Ẁ':'W','Ẃ':'W','Ŵ':'W','Ẇ':'W','Ẅ':'W','Ẉ':'W','Ⱳ':'W','X':'X','Ⓧ':'X','Ｘ':'X',
		'Ẋ':'X','Ẍ':'X','Y':'Y','Ⓨ':'Y','Ｙ':'Y','Ỳ':'Y','Ý':'Y','Ŷ':'Y','Ỹ':'Y','Ȳ':'Y','Ẏ':'Y','Ÿ':'Y','Ỷ':'Y',
		'Ỵ':'Y','Ƴ':'Y','Ɏ':'Y','Ỿ':'Y','Z':'Z','Ⓩ':'Z','Ｚ':'Z','Ź':'Z','Ẑ':'Z','Ż':'Z','Ž':'Z','Ẓ':'Z','Ẕ':'Z',
		'Ƶ':'Z','Ȥ':'Z','Ɀ':'Z','Ⱬ':'Z','Ꝣ':'Z','a':'a','ⓐ':'a','ａ':'a','ẚ':'a','à':'a','á':'a','â':'a','ầ':'a',
		'ấ':'a','ẫ':'a','ẩ':'a','ã':'a','ā':'a','ă':'a','ằ':'a','ắ':'a','ẵ':'a','ẳ':'a','ȧ':'a','ǡ':'a','ä':'a',
		'ǟ':'a','ả':'a','å':'a','ǻ':'a','ǎ':'a','ȁ':'a','ȃ':'a','ạ':'a','ậ':'a','ặ':'a','ḁ':'a','ą':'a','ⱥ':'a',
		'ɐ':'a','ꜳ':'aa','æ':'ae','ǽ':'ae','ǣ':'ae','ꜵ':'ao','ꜷ':'au','ꜹ':'av','ꜻ':'av','ꜽ':'ay','b':'b','ⓑ':'b',
		'ｂ':'b','ḃ':'b','ḅ':'b','ḇ':'b','ƀ':'b','ƃ':'b','ɓ':'b','c':'c','ⓒ':'c','ｃ':'c','ć':'c','ĉ':'c','ċ':'c',
		'č':'c','ç':'c','ḉ':'c','ƈ':'c','ȼ':'c','ꜿ':'c','ↄ':'c','d':'d','ⓓ':'d','ｄ':'d','ḋ':'d','ď':'d','ḍ':'d',
		'ḑ':'d','ḓ':'d','ḏ':'d','đ':'d','ƌ':'d','ɖ':'d','ɗ':'d','ꝺ':'d','ǳ':'dz','ǆ':'dz','e':'e','ⓔ':'e','ｅ':'e',
		'è':'e','é':'e','ê':'e','ề':'e','ế':'e','ễ':'e','ể':'e','ẽ':'e','ē':'e','ḕ':'e','ḗ':'e','ĕ':'e','ė':'e','ë':'e',
		'ẻ':'e','ě':'e','ȅ':'e','ȇ':'e','ẹ':'e','ệ':'e','ȩ':'e','ḝ':'e','ę':'e','ḙ':'e','ḛ':'e','ɇ':'e','ɛ':'e','ǝ':'e',
		'f':'f','ⓕ':'f','ｆ':'f','ḟ':'f','ƒ':'f','ꝼ':'f','g':'g','ⓖ':'g','ｇ':'g','ǵ':'g','ĝ':'g','ḡ':'g','ğ':'g',
		'ġ':'g','ǧ':'g','ģ':'g','ǥ':'g','ɠ':'g','ꞡ':'g','ᵹ':'g','ꝿ':'g','h':'h','ⓗ':'h','ｈ':'h','ĥ':'h','ḣ':'h',
		'ḧ':'h','ȟ':'h','ḥ':'h','ḩ':'h','ḫ':'h','ẖ':'h','ħ':'h','ⱨ':'h','ⱶ':'h','ɥ':'h','ƕ':'hv','i':'i','ⓘ':'i',
		'ｉ':'i','ì':'i','í':'i','î':'i','ĩ':'i','ī':'i','ĭ':'i','ï':'i','ḯ':'i','ỉ':'i','ǐ':'i','ȉ':'i','ȋ':'i',
		'ị':'i','į':'i','ḭ':'i','ɨ':'i','ı':'i','j':'j','ⓙ':'j','ｊ':'j','ĵ':'j','ǰ':'j','ɉ':'j','k':'k','ⓚ':'k',
		'ｋ':'k','ḱ':'k','ǩ':'k','ḳ':'k','ķ':'k','ḵ':'k','ƙ':'k','ⱪ':'k','ꝁ':'k','ꝃ':'k','ꝅ':'k','ꞣ':'k','l':'l',
		'ⓛ':'l','ｌ':'l','ŀ':'l','ĺ':'l','ľ':'l','ḷ':'l','ḹ':'l','ļ':'l','ḽ':'l','ḻ':'l','ſ':'l','ł':'l','ƚ':'l',
		'ɫ':'l','ⱡ':'l','ꝉ':'l','ꞁ':'l','ꝇ':'l','ǉ':'lj','m':'m','ⓜ':'m','ｍ':'m','ḿ':'m','ṁ':'m','ṃ':'m','ɱ':'m',
		'ɯ':'m','n':'n','ⓝ':'n','ｎ':'n','ǹ':'n','ń':'n','ñ':'n','ṅ':'n','ň':'n','ṇ':'n','ņ':'n','ṋ':'n','ṉ':'n',
		'ƞ':'n','ɲ':'n','ŉ':'n','ꞑ':'n','ꞥ':'n','ǌ':'nj','o':'o','ⓞ':'o','ｏ':'o','ò':'o','ó':'o','ô':'o','ồ':'o',
		'ố':'o','ỗ':'o','ổ':'o','õ':'o','ṍ':'o','ȭ':'o','ṏ':'o','ō':'o','ṑ':'o','ṓ':'o','ŏ':'o','ȯ':'o','ȱ':'o','ö':'o',
		'ȫ':'o','ỏ':'o','ő':'o','ǒ':'o','ȍ':'o','ȏ':'o','ơ':'o','ờ':'o','ớ':'o','ỡ':'o','ở':'o','ợ':'o','ọ':'o','ộ':'o',
		'ǫ':'o','ǭ':'o','ø':'o','ǿ':'o','ɔ':'o','ꝋ':'o','ꝍ':'o','ɵ':'o','œ':'oe','ƣ':'oi','ȣ':'ou','ꝏ':'oo','p':'p',
		'ⓟ':'p','ｐ':'p','ṕ':'p','ṗ':'p','ƥ':'p','ᵽ':'p','ꝑ':'p','ꝓ':'p','ꝕ':'p','q':'q','ⓠ':'q','ｑ':'q','ɋ':'q',
		'ꝗ':'q','ꝙ':'q','r':'r','ⓡ':'r','ｒ':'r','ŕ':'r','ṙ':'r','ř':'r','ȑ':'r','ȓ':'r','ṛ':'r','ṝ':'r','ŗ':'r',
		'ṟ':'r','ɍ':'r','ɽ':'r','ꝛ':'r','ꞧ':'r','ꞃ':'r','s':'s','ⓢ':'s','ｓ':'s','ß':'s','ś':'s','ṥ':'s','ŝ':'s',
		'ṡ':'s','š':'s','ṧ':'s','ṣ':'s','ṩ':'s','ș':'s','ş':'s','ȿ':'s','ꞩ':'s','ꞅ':'s','ẛ':'s','t':'t','ⓣ':'t',
		'ｔ':'t','ṫ':'t','ẗ':'t','ť':'t','ṭ':'t','ț':'t','ţ':'t','ṱ':'t','ṯ':'t','ŧ':'t','ƭ':'t','ʈ':'t','ⱦ':'t','ꞇ':'t',
		'ꜩ':'tz','u':'u','ⓤ':'u','ｕ':'u','ù':'u','ú':'u','û':'u','ũ':'u','ṹ':'u','ū':'u','ṻ':'u','ŭ':'u','ü':'u',
		'ǜ':'u','ǘ':'u','ǖ':'u','ǚ':'u','ủ':'u','ů':'u','ű':'u','ǔ':'u','ȕ':'u','ȗ':'u','ư':'u','ừ':'u','ứ':'u','ữ':'u',
		'ử':'u','ự':'u','ụ':'u','ṳ':'u','ų':'u','ṷ':'u','ṵ':'u','ʉ':'u','v':'v','ⓥ':'v','ｖ':'v','ṽ':'v','ṿ':'v',
		'ʋ':'v','ꝟ':'v','ʌ':'v','ꝡ':'vy','w':'w','ⓦ':'w','ｗ':'w','ẁ':'w','ẃ':'w','ŵ':'w','ẇ':'w','ẅ':'w','ẘ':'w',
		'ẉ':'w','ⱳ':'w','x':'x','ⓧ':'x','ｘ':'x','ẋ':'x','ẍ':'x','y':'y','ⓨ':'y','ｙ':'y','ỳ':'y','ý':'y','ŷ':'y',
		'ỹ':'y','ȳ':'y','ẏ':'y','ÿ':'y','ỷ':'y','ẙ':'y','ỵ':'y','ƴ':'y','ɏ':'y','ỿ':'y','z':'z','ⓩ':'z','ｚ':'z',
		'ź':'z','ẑ':'z','ż':'z','ž':'z','ẓ':'z','ẕ':'z','ƶ':'z','ȥ':'z','ɀ':'z','ⱬ':'z','ꝣ':'z'};
	let chars = [];
	for (let i = 0; i < str.length; i++) {
		let plain = map[str[i]];
		if (!plain) {
			chars.push([i, str[i]]);
		}
		else {
			for (let char of plain) {
				chars.push([i, char]);
			}
		}
	}
	return chars;
}

import { HIGHLIGHT_COLORS } from './colors';

export default {
	strong: {
		inclusive: true,
		parseDOM: [
			{ tag: 'strong' },
			// From ProseMirror source:
			// This works around a Google Docs misbehavior where
			// pasted content will be inexplicably wrapped in `<b>`
			// tags with a font-weight normal.
			{
				tag: 'b',
				getAttrs: dom => dom.style.fontWeight !== 'normal' && null
			},
			{
				style: 'font-weight',
				getAttrs: value => /^(bold(er)?|[5-9]\d{2,})$/.test(value) && null
			},
			{ tag: 'dt' }
		],
		toDOM: () => ['strong', 0]
	},


	em: {
		inclusive: true,
		parseDOM: [
			{ tag: 'i' },
			{ tag: 'em' },
			{ style: 'font-style=italic' },
			{ tag: 'cite' },
			{ tag: 'dfn' },
			{ tag: 'q' }
		],
		toDOM: () => ['em', 0]
	},


	underline: {
		inclusive: true,
		parseDOM: [
			{ tag: 'u' },
			{ style: 'text-decoration=underline' },
			{ style: 'text-decoration-line=underline' }
		],
		toDOM: () => ['u', 0]
	},


	strike: {
		inclusive: true,
		parseDOM: [
			{ tag: 's' },
			{ tag: 'strike' },
			{ tag: 'del' },
			{ style: 'text-decoration=line-through' },
			{ style: 'text-decoration-line=line-through' }
		],
		// Unfortunately Zotero TinyMCE doesn't support <s>
		toDOM: () => ['span', { style: 'text-decoration: line-through' }, 0]
	},


	subsup: {
		inclusive: true,
		attrs: { type: { default: 'sub' } },
		parseDOM: [
			{ tag: 'sub', attrs: { type: 'sub' } },
			{ style: 'vertical-align=sub', attrs: { type: 'sub' } },
			{ tag: 'sup', attrs: { type: 'sup' } },
			{ style: 'vertical-align=super', attrs: { type: 'sup' } }
		],
		toDOM: mark => [mark.attrs.type]
	},


	textColor: {
		inclusive: true,
		attrs: { color: {} },
		parseDOM: [{
			style: 'color',
			getAttrs: value => ({ color: value })
		}],
		toDOM: mark => ['span', { style: `color: ${mark.attrs.color}` }, 0]
	},


	backgroundColor: {
		inclusive: true,
		attrs: { color: {} },
		parseDOM: [{
			style: 'background-color',
			getAttrs: value => ({ color: value })
		}],
		toDOM: mark => {
			let color = mark.attrs.color;
			if (color) {
				color = color.toLowerCase();
				// Add 50% opacity if it has one of highlight colors
				if (HIGHLIGHT_COLORS.map(x => x[1].slice(0, 7)).includes(color)) {
					color += '80';
				}
			}
			return ['span', { style: 'background-color: ' + color }, 0]
		}
	},


	link: {
		// excludes: 'textColor backgroundColor',
		inclusive: false,
		attrs: {
			href: {},
			title: { default: null }
		},
		parseDOM: [{
			tag: 'a[href]',
			getAttrs: dom => ({
				href: dom.getAttribute('href'),
				title: dom.getAttribute('title')
			})
		}],
		toDOM: mark => ['a', {
			...mark.attrs,
			rel: 'noopener noreferrer nofollow'
		}, 0]
	},


	// Additional constraints are applied through transformations
	code: {
		excludes: `_`,
		inclusive: true,
		parseDOM: [
			{ tag: 'code', preserveWhitespace: true },
			{ tag: 'tt', preserveWhitespace: true },
			{ tag: 'kbd', preserveWhitespace: true },
			{ tag: 'samp', preserveWhitespace: true },
			{ tag: 'var', preserveWhitespace: true },
			{
				style: 'font-family',
				preserveWhitespace: true,
				getAttrs: value => (value.toLowerCase().indexOf('monospace') > -1) && null
			},
			{ style: 'white-space=pre', preserveWhitespace: true }
		],
		toDOM: () => ['code', 0]
	}
};

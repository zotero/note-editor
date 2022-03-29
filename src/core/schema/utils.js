import { DOMParser, DOMSerializer, Schema } from 'prosemirror-model';
import { schema } from './index';
import { encodeObject, formatCitationItem } from '../utils';

// Note: TinyMCE is automatically removing div nodes without text and triggering immediate update/sync

export function buildToHTML(schema) {
	return function (content, metadata) {
		// Return an empty string if note is empty to allow Zotero to
		// determine if note is empty. Though, this won't allow container
		// metadata to survive after note is cleared and then re-opened
		if (content.childCount === 1
			&& content.firstChild.isTextblock
			&& content.firstChild.content.size === 0) {
			return '';
		}

		let fragment = DOMSerializer.fromSchema(schema).serializeFragment(content);
		let doc = document.implementation.createHTMLDocument('New');
		let tmp = doc.body;

		let container = doc.createElement('div');

		let metadataAttributes = metadata.serializeAttributes();
		let keys = Object.keys(metadataAttributes).sort()
		for (let key of keys) {
			let value = metadataAttributes[key];
			container.setAttribute(key, value);
		}

		tmp.append(container);
		container.append(fragment);

		let textNodes = [
			'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'pre'
		];

		let blockNodes = [
			'ol', 'ul', 'li', 'hr', 'blockquote', 'table', 'th', 'tr', 'td', 'thead', 'tbody', 'tfoot'
		];

		let nodes = tmp.querySelectorAll([...textNodes, ...blockNodes].join(','));
		for (let node of nodes) {
			if (blockNodes.includes(node.nodeName.toLowerCase())) {
				node.insertBefore(doc.createTextNode('\n'), node.firstChild);
			}
			node.parentNode.insertBefore(doc.createTextNode('\n'), node.nextSibling);
		}

		nodes = tmp.querySelectorAll('li');
		for (let node of nodes) {
			if (node.children.length === 1
				&& node.firstElementChild.nodeName === 'P') {
				node.firstElementChild.replaceWith(...node.firstElementChild.childNodes);
			}
		}

		return tmp.innerHTML.trim();
	};
}

export function buildFromHTML(schema) {
	return function (html, slice) {
		let domNode = document.createElement('div');
		domNode.innerHTML = html;
		let fragment = document.createDocumentFragment();
		while (domNode.firstChild) {
			fragment.appendChild(domNode.firstChild);
		}
		if (slice) {
			return DOMParser.fromSchema(schema).parseSlice(fragment);
		}
		else {
			return DOMParser.fromSchema(schema).parse(fragment);
		}
	};
}

export function buildClipboardSerializer(provider, schema, metadata) {
	let base = DOMSerializer.fromSchema(schema);
	return new DOMSerializer(Object.assign({}, base.nodes, {
		image(node) {
			let annotation;
			if (node.attrs.annotation) {
				annotation = JSON.parse(JSON.stringify(node.attrs.annotation));
				if (annotation.citationItem) {
					metadata.fillCitationItemsWithData([annotation.citationItem]);
				}
			}

			let attrs = {
				src: node.attrs.src,
				alt: node.attrs.alt,
				title: node.attrs.title,
				width: node.attrs.width,
				height: node.attrs.height,
				'data-annotation': annotation && encodeObject(annotation)
			};

			let data = provider.getCachedData(node.attrs.nodeID, 'image');
			if (data) {
				if (attrs.src) {
					attrs['data-original-src'] = attrs.src;
				}
				attrs.src = data.src;
			}
			return ['img', attrs];
		},
		citation(node) {
			let citation;
			if (node.attrs.citation) {
				citation = JSON.parse(JSON.stringify(node.attrs.citation));
				if (Array.isArray(citation.citationItems)) {
					metadata.fillCitationItemsWithData(citation.citationItems);
				}
			}
			let children = serializeCitationInnerHTML(node);
			return ['span', {
				class: 'citation',
				'data-citation': citation && encodeObject(citation)
			}, ...children];
		},
		highlight(node) {
			let annotation;
			if (node.attrs.annotation) {
				annotation = JSON.parse(JSON.stringify(node.attrs.annotation));
				if (annotation.citationItem) {
					metadata.fillCitationItemsWithData([annotation.citationItem]);
				}
			}
			return ['span', {
				class: 'highlight',
				'data-annotation': annotation && encodeObject(annotation)
			}, 0];
		}
	}), base.marks);
}

export function serializeCitationInnerHTML(node) {
	let children = ['('];
	try {
		let citation = JSON.parse(JSON.stringify(node.attrs.citation));
		node.type.schema.cached.metadata.fillCitationItemsWithData(citation.citationItems);
		citation.citationItems.forEach((citationItem, index, array) => {
			if (citationItem.itemData) {
				children.push(['span', { class: 'citation-item' }, formatCitationItem(citationItem)]);
				if (index !== array.length - 1) {
					children.push('; ');
				}
			}
		});
	}
	catch (e) {
		console.log(e);
	}
	children.push(')');
	return children;
}

export function serializeCitationInnerText(node) {
	let children = ['('];
	try {
		let citation = JSON.parse(JSON.stringify(node.attrs.citation));
		node.type.schema.cached.metadata.fillCitationItemsWithData(citation.citationItems);
		citation.citationItems.forEach((citationItem, index, array) => {
			if (citationItem.itemData) {
				children.push(formatCitationItem(citationItem));
				if (index !== array.length - 1) {
					children.push('; ');
				}
			}
		});
	}
	catch (e) {
		console.log(e);
	}
	children.push(')');
	return children.join('');
}

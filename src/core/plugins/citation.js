import { Plugin, PluginKey, TextSelection } from 'prosemirror-state';
import { schema, QUOTATION_MARKS } from '../schema';
import { getSingleSelectedNode } from '../commands';
import { basicDeepEqual, formatCitation, randomString } from '../utils';

class Citation {
	constructor(state, options) {
		this.options = options;
		this.popup = { active: false };
		this.state = {
			canAddCitations: false,
			canRemoveCitations: false,
			canAddCitation: false
		};
	}

	update(state, oldState) {
		if (!this.view) {
			return;
		}

		let nodeData = getSingleSelectedNode(state, schema.nodes.citation);
		if (nodeData) {
			let { node, pos } = nodeData;
			let dom = this.view.nodeDOM(pos);

			let canOpen = false;
			// TODO: Support multi-item citations
			if (node.attrs.citation
				&& node.attrs.citation.citationItems
				&& node.attrs.citation.citationItems[0]) {
				let citationItem = node.attrs.citation.citationItems[0];
				if (citationItem.locator && (!citationItem.label || citationItem.label === 'page')) {
					canOpen = true;
				}
			}

			let hasAnnotationPair = this.hasAnnotationPairBefore(state.doc, node, pos);

			canOpen = canOpen && !hasAnnotationPair;
			let canRemove = hasAnnotationPair;

			this.popup = {
				active: true,
				node: dom,
				canOpen,
				canRemove,
				showItem: () => {
					this.options.onShowItem(node);
				},
				open: () => {
					this.options.onOpen(node);
				},
				edit: () => {
					this.options.onEdit(node);
				},
				remove: () => {
					let { state, dispatch } = this.view;
					let { tr, doc } = state;
					let pos2;
					for (let i = pos; i >= 0; i--) {
						let node = doc.nodeAt(i);
						if (node && ['highlight', 'underline', 'image'].includes(node.type.name)) {
							pos2 = i + node.nodeSize;
							break;
						}
					}

					tr.delete(pos2, pos + node.nodeSize);
					dispatch(tr);
				},
				refocusView: () => {
					this.view.focus();
				}
			};
		}
		else {
			this.popup = { active: false };
		}

		this.state = {
			canAddCitations: this.canAddCitations(),
			canRemoveCitations: this.canRemoveCitations(),
			addCitations: this.addCitations.bind(this),
			removeCitations: this.removeCitations.bind(this),
			canAddCitationAfter: this.canAddCitationAfter.bind(this),
			addCitationAfter: this.addCitationAfter.bind(this),
			insertCitation: this.insertCitation.bind(this)
		};
	}

	destroy() {
		this.popup = { active: false };
	}

	insertCitation() {
		this.view.focus();
		let { state, dispatch } = this.view;
		let { selection } = state;
		let { from, $from } = selection;

		if ([schema.nodes.highlight, schema.nodes.underline_annotation].includes($from.parent.type)) {
			this.addCitationAfter();
			return;
		}

		let citation = {
			citationItems: [],
			properties: {}
		};

		let nodeID = randomString();
		let citationNode = schema.nodes.citation.create({ nodeID, citation });

		dispatch(state.tr.replaceSelectionWith(citationNode));
		// TODO: Fix the temporary work-around
		window._currentEditorInstance._postMessage({ action: 'openCitationPopup', nodeID, citation });
	}

	isCitationAndAnnotationPair(annotation, citation) {
		if (!annotation.citationItem || citation.citationItems.length !== 1) {
			return false;
		}

		let citationItem1 = JSON.parse(JSON.stringify(annotation.citationItem));
		let citationItem2 = JSON.parse(JSON.stringify(citation.citationItems[0]));

		if (!citationItem1.uris.some(u => citationItem2.uris.includes(u))) {
			return false;
		}

		delete citationItem1.uris;
		delete citationItem2.uris;

		return basicDeepEqual(citationItem1, citationItem2);
	}

	addCitationAfter(testOnly) {
		let { state, dispatch } = this.view;
		let { doc, tr } = state;

		let nodeData = getSingleSelectedNode(state, schema.nodes.highlight, true)
			|| getSingleSelectedNode(state, schema.nodes.underline_annotation)
			|| getSingleSelectedNode(state, schema.nodes.image);

		if (nodeData && nodeData.node.attrs.annotation) {
			let { node, pos, index, parent } = nodeData;

			pos = pos + node.nodeSize;

			if (!this.getCitationPairAfter(doc, node, pos)) {
				if (testOnly) {
					return true;
				}

				this.addCitation(tr, node, pos);
				dispatch(tr);
				return true;
			}
		}
		return false;
	}

	canAddCitationAfter() {
		return this.addCitationAfter(true);
	}

	getCitationPairAfter(doc, annotation, pos) {
		for (let i = pos; i < doc.content.size; i++) {
			let child = doc.nodeAt(i);
			if (!child) {
				break;
			}
			else if (child.type.name === 'hardBreak') {

			}
			else if (child.type.name === 'citation') {
				let citation = child;
				if (this.isCitationAndAnnotationPair(
					annotation.attrs.annotation,
					citation.attrs.citation)) {
					return {
						from: pos,
						to: i + citation.nodeSize
					}
				}
				break;
			}
			else if (child.type.name === 'text') {
				if (child.text.trim().length) {
					break;
				}
			}
			else {
				break;
			}
		}
	}

	hasAnnotationPairBefore(doc, citation, pos) {
		let annotationPos = null;
		for (let i = pos; i >= 0; i--) {
			let node = doc.nodeAt(i);
			if (node && node.attrs.annotation) {
				if (!this.isCitationAndAnnotationPair(node.attrs.annotation, citation.attrs.citation)) {
					return false;
				}
				annotationPos = i + node.nodeSize;
				break;
			}
		}

		if (annotationPos === null) {
			return false;
		}

		for (let i = annotationPos; i < doc.content.size; i++) {
			let child = doc.nodeAt(i);
			if (!child) {
				break;
			}
			else if (child.type.name === 'hardBreak') {
			}
			else if (child.type.name === 'citation') {
				if (child === citation) {
					return true;
				}
				return false;
			}
			else if (child.type.name === 'text') {
				if (child.text.trim().length) {
					break;
				}
			}
			else {
				break;
			}
		}
		return false;
	}

	addCitation(tr, annotationNode, pos) {
		let citationItem = JSON.parse(JSON.stringify(annotationNode.attrs.annotation.citationItem));
		let citation = {
			citationItems: [citationItem],
			properties: {}
		};

		let formattedCitation = formatCitation(citation);
		let citationNode = schema.nodes.citation.create(
			{ nodeID: randomString(), citation },
			[schema.text('(' + formattedCitation + ')')]
		);

		let whiteSpaceNode = annotationNode.type === schema.nodes.image
			? schema.nodes.hardBreak.create()
			: schema.text(' ');

		tr.insert(pos, [whiteSpaceNode, citationNode])
	}

	canAddCitations() {
		return this.addCitations(true);
	}

	canRemoveCitations() {
		return this.removeCitations(true);
	}

	addCitations(testOnly) {
		let { state, dispatch } = this.view;
		let { doc, tr } = state;
		let ranges = [];
		doc.descendants((node, pos, parent, index) => {
			let annotation = node.attrs.annotation;
			if (annotation && annotation.citationItem) {
				let textContent = node.textContent;
				if (['highlight', 'underline'].includes(annotation.type)
					&& (!QUOTATION_MARKS.includes(textContent[0])
						|| !QUOTATION_MARKS.includes(textContent[textContent.length - 1]))) {
					return;
				}
				let range = this.getCitationPairAfter(doc, node, pos + node.nodeSize);
				if (!range) {
					ranges.push({
						node,
						from: pos,
						to: pos + node.nodeSize
					});
					if (testOnly) {
						return true;
					}
				}
			}
		});
		if (testOnly || !ranges.length) {
			return !!ranges.length;
		}
		ranges = ranges.reverse();
		for (let range of ranges) {
			let pos = range.to;
			this.addCitation(tr, range.node, pos);
		}
		dispatch(tr);
		return true;
	}

	removeCitations(testOnly) {
		let { state, dispatch } = this.view;
		let { doc, tr } = state;
		let ranges = [];
		state.doc.descendants((node, pos, parent, index) => {
			let annotation = node.attrs.annotation;
			if (annotation && annotation.citationItem) {
				let textContent = node.textContent;
				if (['highlight', 'underline'].includes(annotation.type)
					&& (!QUOTATION_MARKS.includes(textContent[0])
						|| !QUOTATION_MARKS.includes(textContent[textContent.length - 1]))) {
					return;
				}
				let range = this.getCitationPairAfter(doc, node,pos + node.nodeSize);
				if (range) {
					ranges.push(range);
					if (testOnly) {
						return true;
					}
				}
			}
		});
		if (testOnly || !ranges.length) {
			return !!ranges.length;
		}
		ranges = ranges.reverse();
		for (let range of ranges) {
			tr.delete(range.from, range.to);
		}
		dispatch(tr);
		return true;
	};
}

export let citationKey = new PluginKey('citation');

export function citation(options) {
	return new Plugin({
		key: citationKey,
		state: {
			init(config, state) {
				return new Citation(state, options);
			},
			apply(tr, pluginState, oldState, newState) {
				return pluginState;
			}
		},
		view: (view) => {
			let pluginState = citationKey.getState(view.state);
			pluginState.view = view;
			return {
				update(view, lastState) {
					pluginState.update(view.state, lastState);
				},
				destroy() {
					pluginState.destroy();
				}
			};
		},
		props: {
			// Work around Firefox 60 bug where wrapped `contenteditable=false`
			// island captures cursor
			handleKeyDown(view, event) {
				if (event.key === 'ArrowDown') {
					let { from, empty } = view.state.selection;
					let node = view.state.doc.nodeAt(from);
					if (empty && node && node.type === schema.nodes.citation) {
						view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.tr.doc, from + node.nodeSize)));
						event.preventDefault();
					}
				}
			}
		}
	});
}

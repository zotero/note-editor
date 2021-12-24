import { Plugin, PluginKey, TextSelection } from 'prosemirror-state';
import { schema } from '../schema';
import { getSingleSelectedNode } from '../commands';
import { formatCitation, randomString } from '../utils';

class Citation {
	constructor(state, options) {
		this.options = options;
		this.popup = { active: false };
		this.state = {
			canAddCitations: true,
			canRemoveCitations: true,
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
			let rect = dom.getBoundingClientRect();

			let canOpen = false;
			try {
				canOpen = node.attrs.citation.citationItems[0].locator;
			}
			catch (e) {
			}

			this.popup = {
				active: true,
				node: dom,
				canOpen,
				showItem: () => {
					this.options.onShowItem(node);
				},
				open: () => {
					this.options.onOpen(node);
				},
				edit: () => {
					this.options.onEdit(node);
				}
			};
			return;
		}

		this.popup = { active: false };

		this.state = {
			canAddCitations: this.canAddCitations(),
			canRemoveCitations: this.canRemoveCitations(),
			addCitations: this.addCitations.bind(this),
			removeCitations: this.removeCitations.bind(this)
		};
	}

	destroy() {
		this.popup = { active: false };
	}

	isCitationAndAnnotationPair(annotation, citation) {
		return (
			annotation.citationItem
			&& citation.citationItems.find(
				ci => ci.uris.find(u => annotation.citationItem.uris.includes(u))
			)
		);
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

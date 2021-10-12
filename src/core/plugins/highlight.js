import { Plugin, PluginKey, TextSelection } from 'prosemirror-state';
import { Fragment, Slice } from 'prosemirror-model';
import { ReplaceAroundStep, ReplaceStep } from 'prosemirror-transform';
import { schema } from '../schema';
import { getSingleSelectedNode } from '../commands';

class Highlight {
	constructor(state, options) {
		this.options = options;
		this.popup = { active: false };
	}

	update(state, oldState) {
		if (!this.view) {
			return;
		}

		let nodeData = getSingleSelectedNode(state, schema.nodes.highlight, true);
		if (nodeData) {
			let { node, pos, index, parent } = nodeData;
			let dom = this.view.nodeDOM(pos);
			let rect = dom.getBoundingClientRect();
			let citation = null;
			// TODO: Add part of this into try / catch to make sure bad data doesn't prevent showing popup here and in other places
			if (node.attrs.annotation.citationItem) {
				for (let i = index + 1; i < parent.childCount; i++) {
					let child = parent.child(i);
					if (child.type.name === 'citation') {
						if (this.citationHasItem(child.attrs.citation, node.attrs.annotation.citationItem)) {
							citation = child;
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

			this.popup = {
				active: true,
				node: dom,
				canAddCitation: !citation && !!node.attrs.annotation.citationItem,
				open: this.open.bind(this),
				unlink: this.unlink.bind(this),
				addCitation: this.addCitation.bind(this)
			};
			return;
		}
		this.popup = { active: false };
	}

	open() {
		let { $from } = this.view.state.selection;
		let node = $from.parent;
		if (node.attrs.annotation) {
			this.options.onOpen(node.attrs.annotation);
		}
	}

	unlink() {
		let { state, dispatch } = this.view;
		let { $from } = state.selection;
		let pos = $from.pos - $from.parentOffset - 1;
		let node = $from.parent;
		let tr = state.tr.step(new ReplaceAroundStep(pos, pos + node.nodeSize, pos + 1, pos + 1 + node.content.size, Slice.empty, 0));
		dispatch(tr);
	}

	addCitation() {
		let { state, dispatch } = this.view;
		let { tr } = state;
		let { $from } = state.selection;
		let node = $from.parent;
		let pos = $from.pos - $from.parentOffset + node.nodeSize - 1;

		let citationItem = JSON.parse(JSON.stringify(node.attrs.annotation.citationItem));
		let citation = {
			citationItems: [citationItem],
			properties: {}
		};

		let citationNode = state.schema.nodes.citation.create({
				...node.attrs,
				citation
			}
		);
		dispatch(tr.insert(pos, [state.schema.text(' '), citationNode]));
	}

	citationHasItem(citation, citationItem) {
		return citation.citationItems.find(ci => ci.uris.find(u => citationItem.uris.includes(u)));
	}

	destroy() {
		this.popup = { active: false };
	}
}

function unlinkHighlights(tr) {
	let updated = false;
	let updatedInLastIteration = false;
	do {
		updatedInLastIteration = false;
		tr.doc.descendants((node, pos) => {
			if (updatedInLastIteration) {
				return false;
			}
			if (node.type.name === 'highlight') {
				if (node.content instanceof Fragment && node.content.content.length) {
					let first = node.content.content[0];
					let last = node.content.content[node.content.content.length - 1];
					if (!first.type.isText || !last.type.isText || node.textContent.length < 2
						|| !['"', '“'].includes(first.text[0])
						|| !['"', '”'].includes(last.text[last.text.length - 1])) {
						tr.step(new ReplaceAroundStep(pos, pos + node.nodeSize, pos + 1, pos + 1 + node.content.size, Slice.empty, 0));
						updated = true;
						updatedInLastIteration = true;
					}
				}
				// Remove empty highlight nodes that appear when deleting whole text
				else {
					tr.delete(pos, pos + node.nodeSize);
					updated = true;
					updatedInLastIteration = true;
				}
			}
		});

	}
	while (updatedInLastIteration);
	return updated;
}

function handleEnter(state, dispatch) {
	let { tr } = state;
	let { $from, $to } = state.selection;
	if ($from.pos === $to.pos && $from.parent.type === schema.nodes.highlight) {
		let blockParent = $from.node(1);
		// https://discuss.prosemirror.net/t/the-weird-backspacing-functionality-with-inline-nodes/2128/8
		let block = blockParent.copy();
		let slice = new Slice(new Fragment([block]), 0, 1);
		tr.replace($from.pos, $from.pos, slice);
		dispatch(tr);
	}
}

export let highlightKey = new PluginKey('highlight');

export function highlight(options) {
	return new Plugin({
		key: highlightKey,
		state: {
			init(config, state) {
				return new Highlight(state, options);
			},
			apply(tr, pluginState, oldState, newState) {
				return pluginState;
			}
		},
		view: (view) => {
			let pluginState = highlightKey.getState(view.state);
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
		// Move characters outside of highlight node when they are
		// inserted at highlight node boundaries
		// Transaction modifications made below aren't properly reflected
		// in undo history, some characters still remain when undoing
		// TODO: Rewrite
		appendTransaction(transactions, oldState, newState) {
			if (!transactions.some(tr => tr.docChanged)) {
				return null;
			}
			let { tr } = newState;
			let updated = false;
			if (newState.selection.empty) {
				transactions.forEach((tr2) => {
					tr2.steps.forEach((step) => {
						if (step instanceof ReplaceStep && step.slice) {
							step.getMap().forEach((oldStart, oldEnd, newStart, newEnd) => {
								// TODO: Investigate this potentially buggy part
								if (oldStart >= oldState.doc.content.size) {
									return;
								}
								let $pos = oldState.doc.resolve(oldStart);
								if ($pos.parent.type.name === 'highlight') {
									if ($pos.parentOffset === 0) {
										tr.delete(newStart, newEnd);
										tr.replace(newStart - 1, newStart - 1, step.slice);
										updated = true;
									}
									else if ($pos.parentOffset === $pos.parent.content.size) {
										tr.delete(newStart, newEnd);
										tr.replace(newStart + 1, newStart + 1, step.slice);
										tr.setSelection(new TextSelection(tr.doc.resolve(newStart + step.slice.size + 1)));
										updated = true;
									}
								}
							});
						}
					});
				});
			}

			if (unlinkHighlights(tr)) {
				updated = true;
			}

			return updated ? tr : null;
		},

		props: {
			handleKeyDown(view, event) {
				if (event.key === 'Enter') {
					handleEnter(view.state, view.dispatch);
				}
			}
		}
	});
}

import { Plugin, PluginKey, TextSelection } from 'prosemirror-state';
import { Fragment, Slice } from 'prosemirror-model';
import { ReplaceAroundStep, ReplaceStep } from 'prosemirror-transform';
import { schema, QUOTATION_MARKS } from '../schema';
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

		let nodeData = getSingleSelectedNode(state, schema.nodes.highlight, true)
			|| getSingleSelectedNode(state, schema.nodes.underline_annotation, true);
		if (nodeData) {
			let { pos } = nodeData;
			let dom = this.view.nodeDOM(pos);
			this.popup = {
				active: true,
				node: dom,
				open: this.open.bind(this),
				unlink: this.unlink.bind(this)
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
			if (['highlight', 'underline'].includes(node.type.name)) {
				if (node.content instanceof Fragment && node.content.content.length) {
					let $pos = tr.doc.resolve(pos);
					if ($pos.node(1).type !== schema.nodes.blockquote) {
						let first = node.content.content[0];
						let last = node.content.content[node.content.content.length - 1];
						if (!first.type.isText || !last.type.isText || node.textContent.length < 2
							|| !QUOTATION_MARKS.includes(first.text[0])
							|| !QUOTATION_MARKS.includes(last.text[last.text.length - 1])) {
							tr.step(new ReplaceAroundStep(pos, pos + node.nodeSize, pos + 1, pos + 1 + node.content.size, Slice.empty, 0));
							updated = true;
							updatedInLastIteration = true;
						}
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
	if ($from.pos === $to.pos && [schema.nodes.highlight, schema.nodes.underline_annotation].includes($from.parent.type)) {
		let blockParent = $from.node(1);
		// https://discuss.prosemirror.net/t/the-weird-backspacing-functionality-with-inline-nodes/2128/8
		let block = blockParent.copy();
		let slice = new Slice(new Fragment([block]), 0, 1);
		tr.replace($from.pos, $from.pos, slice);
		dispatch(tr);
	}
}

function handleBackspace(state, dispatch) {
	let { tr } = state;
	let { $from, $to } = state.selection;
	if ($from.pos === $to.pos) {
		if ($from.nodeBefore && [schema.nodes.highlight, schema.nodes.underline_annotation].includes($from.nodeBefore.type)) {
			dispatch(tr.setSelection(TextSelection.create(tr.doc, $from.pos - 1)));
		}
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
								if (['highlight', 'underline'].includes($pos.parent.type.name)) {
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
				else if (event.key === 'Backspace') {
					handleBackspace(view.state, view.dispatch);
				}
			}
		}
	});
}

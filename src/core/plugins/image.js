import { Plugin, PluginKey } from 'prosemirror-state';
import { ReplaceAroundStep, ReplaceStep } from 'prosemirror-transform';
import { SetAttrsStep } from '../utils';
import { highlightKey } from './highlight';
import { Slice } from 'prosemirror-model';

function getNode(state) {
	const { $from, $to, $cursor } = state.selection;

	let nodes = [];
	state.doc.nodesBetween($from.pos, $to.pos, (parentNode, parentPos) => {
		parentNode.forEach((node, offset, index) => {
			let absolutePos = parentPos + offset + 1;
			if (node.type.name === 'image') {
				// console.log($from.pos, $to.pos, absolutePos)
				if ($from.pos === absolutePos && $to.pos === absolutePos + node.nodeSize) {
					nodes.push({ pos: absolutePos, node, parent: parentNode, index });
				}
			}
		});
	});
	if (nodes.length === 1) {
		return nodes[0];
	}
	return null;
}

class Image {
	constructor(state, options) {
		this.options = options;
		this.popup = {
			isActive: false
		};
		// this.onOpenURL = options.onOpenURL;
	}

	update(state, oldState) {
		if (!this.view) {
			this.popup = { ...this.popup, isActive: false };
			return;
		}

		let node = getNode(state);

		let pos;
		let index;
		let parent;
		if (node) {
			pos = node.pos;
			index = node.index;
			parent = node.parent;
			node = node.node;
			if (!node.attrs.annotation) {
				return;
			}
		}

		if (node) {
			let { from, to } = state.selection;

			// TODO: Should be within the bounds of the highlight

			// These are in screen coordinates
			// We can't use EditorView.cordsAtPos here because it can't handle linebreaks correctly
			// See: https://github.com/ProseMirror/prosemirror-view/pull/47
			let start = this.view.coordsAtPos(from);
			let end = this.view.coordsAtPos(to);
			let isMultiline = start.top !== end.top;
			let left = isMultiline ? start.left : start.left + (end.left - start.left) / 2;

			let dom = this.view.nodeDOM(pos);
			let rect = dom.getBoundingClientRect();

			let next = this.view.state.doc.resolve(pos);

			let citation = null;
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
				else if (child.type.name !== 'hardBreak') {
					break;
				}
			}

			this.popup = {
				isActive: true,
				left,
				top: start.top,
				bottom: end.bottom,
				isMultiline,
				pos: from,
				rect,
				enableAddCitation: !citation,
				open: this.open.bind(this),
				unlink: this.unlink.bind(this),
				addCitation: this.addCitation.bind(this)
			};
			return;
		}

		this.popup = {
			isActive: false
		};
	}

	open() {
		let { $from } = this.view.state.selection;
		let { node } = getNode(this.view.state);
		if (node.attrs.annotation) {
			this.options.onOpen(node.attrs.annotation);
		}
	}

	unlink() {
		let { state, dispatch } = this.view;
		let { tr } = state;
		let node = getNode(state);
		if (node) {
			tr.setNodeMarkup(node.pos, null, {
				...node.node.attrs,
				annotation: null
			});
			dispatch(tr);
		}
	}

	addCitation() {
		// TODO: The way how this works is too complicated
		let { state, dispatch } = this.view;
		let { tr } = state;
		let { $to } = state.selection;
		let { node } = getNode(state);
		let pos = $to.pos;

		let citation = {
			citationItems: [node.attrs.annotation.citationItem],
			properties: {}
		};
		dispatch(tr.insert(pos, [state.schema.nodes.hardBreak.create()]));
		this.options.onGenerateCitation(citation, pos + 1);
	}

	citationHasItem(citation, citationItem) {
		return citation.citationItems.find(ci => ci.uris.find(u => citationItem.uris.includes(u)));
	}

	destroy() {
		this.popup = { ...this.popup, isActive: false };
	}
}

function getAttachmentKeys(state) {
	let attachmentKeys = [];
	state.tr.doc.descendants((node, pos) => {
		if (node.type.name === 'image' && node.attrs.attachmentKey) {
			attachmentKeys.push(node.attrs.attachmentKey);
		}
	});
	return attachmentKeys;
}

export let imageKey = new PluginKey('image');

export function image(options) {
	let prevAttachmentKeys = null;
	return new Plugin({
		key: imageKey,
		state: {
			init(config, state) {
				return new Image(state, options);
			},
			apply(tr, pluginState, oldState, newState) {
				return pluginState;
			}
		},
		view: (view) => {
			let pluginState = imageKey.getState(view.state);
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
		appendTransaction(transactions, oldState, newState) {
			let newTr = newState.tr;

			let changed = transactions.some(tr => tr.docChanged);

			if (!changed) return;

			let attachmentKeys = getAttachmentKeys(newState);
			if (changed && !prevAttachmentKeys) {
				options.onSyncAttachmentKeys(attachmentKeys);
			}
			else if (JSON.stringify(attachmentKeys) !== JSON.stringify(prevAttachmentKeys)) {
				options.onSyncAttachmentKeys(attachmentKeys);
			}
			prevAttachmentKeys = attachmentKeys;


			let updatedDimensions = false;
			if (changed) {
				newState.doc.descendants((node, pos) => {
					if (node.type.name === 'image'
						&& options.dimensionsStore.data[node.attrs.nodeID]) {
						let [width, height] = options.dimensionsStore.data[node.attrs.nodeID];
						newTr = newTr.step(new SetAttrsStep(pos, {
							...node.attrs,
							width,
							height
						})).setMeta('addToHistory', false);
						updatedDimensions = true;
					}
				});

				options.dimensionsStore.data = {};
			}

			let images = [];
			transactions.forEach((tr) => {
				tr.steps.forEach((step) => {
					if (tr.getMeta('importImages') && step instanceof ReplaceStep && step.slice) {
						step.getMap().forEach((oldStart, oldEnd, newStart, newEnd) => {
							newState.doc.nodesBetween(newStart, newEnd, (parentNode, parentPos) => {
								parentNode.forEach((node, offset) => {
									let absolutePos = parentPos + offset + 1;
									if (node.type.name === 'image' && node.attrs.src && !node.attrs.attachmentKey) {
										images.push({ nodeID: node.attrs.nodeID, src: node.attrs.src });
										if (node.attrs.src.startsWith('data:')) {
											// Unset src to make sure data URL is never saved,
											// although, on import failure this results to empty img tag
											// TODO: Remove empty img elements, although make sure they aren't being imported
											newTr = newTr.step(new SetAttrsStep(absolutePos, {
												...node.attrs,
												src: null
											})).setMeta('addToHistory', false);
										}
									}
								});
							});
						});
					}
				});
			});

			if (images.length) {
				options.onImportImages(images);
			}

			if (updatedDimensions || images.length) {
				return newTr;
			}
		}
	});
}

import { Plugin, PluginKey } from 'prosemirror-state';
import { ReplaceStep } from 'prosemirror-transform';
import { schema } from '../schema';
import { formatCitation, SetAttrsStep } from '../utils';
import { getSingleSelectedNode } from '../commands';

class Image {
	constructor(state, options) {
		this.options = options;
		this.popup = { active: false };
	}

	update(state, oldState) {
		if (!this.view) {
			return;
		}

		let nodeData = getSingleSelectedNode(state, schema.nodes.image);
		if (nodeData) {
			let { node, pos, index, parent } = nodeData;

			if (!node.attrs.annotation) {
				return;
			}

			let dom = this.view.nodeDOM(pos);
			let rect = dom.getBoundingClientRect();

			let next = this.view.state.doc.resolve(pos);

			let citation = null;
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
					else if (child.type.name !== 'hardBreak') {
						break;
					}
				}
			}

			this.popup = {
				active: true,
				rect,
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
		let nodeData = getSingleSelectedNode(this.view.state, schema.nodes.image);
		if (nodeData) {
			let { node } = nodeData;
			if (node.attrs.annotation) {
				this.options.onOpen(node.attrs.annotation);
			}
		}
	}

	unlink() {
		let { state, dispatch } = this.view;
		let { tr } = state;
		let nodeData = getSingleSelectedNode(state, schema.nodes.image);
		if (nodeData) {
			let { node, pos } = nodeData;
			tr.setNodeMarkup(pos, null, {
				...node.attrs,
				annotation: null
			});
			dispatch(tr);
		}
	}

	addCitation() {
		let { state, dispatch } = this.view;
		let { tr } = state;
		let { $to } = state.selection;
		let nodeData = getSingleSelectedNode(state, schema.nodes.image);
		if (nodeData) {
			let { node } = nodeData;
			let pos = $to.pos;

			let citationItem = JSON.parse(JSON.stringify(node.attrs.annotation.citationItem));
			this.options.metadata.fillCitationItemsWithData([citationItem]);
			let citation = {
				citationItems: [citationItem],
				properties: {}
			};

			let formattedCitation = formatCitation(citation);
			let citationNode = state.schema.nodes.citation.create({
					...node.attrs,
					citation
				},
				[
					state.schema.text('(' + formattedCitation + ')')
				]
			);
			dispatch(tr.insert(pos, [state.schema.text(' '), citationNode]));
		}
	}

	citationHasItem(citation, citationItem) {
		return citation.citationItems.find(ci => ci.uris.find(u => citationItem.uris.includes(u)));
	}

	destroy() {
		this.popup = { active: false };
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

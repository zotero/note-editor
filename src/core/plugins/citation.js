import { Plugin, PluginKey, TextSelection } from 'prosemirror-state';
import { schema } from '../schema';
import { getSingleSelectedNode } from '../commands';

class Citation {
	constructor(state, options) {
		this.options = options;
		this.popup = { active: false };
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
	}

	destroy() {
		this.popup = { active: false };
	}
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

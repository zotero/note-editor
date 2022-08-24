import { Plugin, PluginKey } from 'prosemirror-state';
import { schema } from '../schema';

class Math {
	constructor(state, options) {

	}

	update(newState, oldState) {
		if (!this.view) {
			return;
		}
		let { dispatch } = this.view;
		let { tr, selection: newSelection } = newState;
		let { selection: oldSelection } = oldState;
		if (newSelection.from !== oldSelection.from && oldSelection.from < tr.doc.content.size) {
			let node = tr.doc.nodeAt(oldSelection.from);
			if (node && node.type === schema.nodes.math_display && !node.content.size) {
				dispatch(tr.replaceWith(oldSelection.from, oldSelection.from + node.nodeSize, schema.nodes.paragraph.create()));
			}
			else if (node && node.type === schema.nodes.math_inline && !node.content.size) {
				dispatch(tr.delete(oldSelection.from, oldSelection.from + node.nodeSize));
			}
		}
	}

	destroy() {

	}
}

export let mathKey = new PluginKey('math');

export function math(options) {
	return new Plugin({
		key: mathKey,
		state: {
			init(config, state) {
				return new Math(state, options);
			},
			apply(tr, pluginState, oldState, newState) {
				return pluginState;
			}
		},
		view: (view) => {
			let pluginState = mathKey.getState(view.state);
			pluginState.view = view;
			return {
				update(view, lastState) {
					pluginState.update(view.state, lastState);
				},
				destroy() {
					pluginState.destroy();
				}
			};
		}
	});
}

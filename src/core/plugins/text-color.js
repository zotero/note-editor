import { Plugin, PluginKey } from 'prosemirror-state';
import { Mark } from 'prosemirror-model';
import { schema, TEXT_COLORS } from '../schema';
import { removeMarkRangeAtCursor, updateMarkRangeAtCursor } from '../commands';
import { getMarkRange } from '../helpers';

const MAX_AVAILABLE_COLORS = 30;

class Color {
	constructor(state, options) {
		this.state = {
			availableColors: TEXT_COLORS,
			activeColors: []
		};
	}

	update(state, oldState) {
		if (!this.view) {
			return;
		}

		let oldCurrentMarks = oldState && (oldState.storedMarks || oldState.selection.$from.marks()) || [];
		let newCurrentMarks = state && (state.storedMarks || state.selection.$from.marks()) || [];

		if (oldState
			&& oldState.doc.eq(state.doc)
			&& oldState.selection.eq(state.selection)
			&& Mark.sameSet(oldCurrentMarks, newCurrentMarks)
		) {
			return;
		}

		let availableColors = [];
		let activeColors = [];

		state.doc.descendants((node, pos) => {
			let mark = node.marks.find(mark => mark.type === schema.marks.textColor);
			if (mark) {
				let color = mark.attrs.color;
				color = color.toLowerCase();
				if (!availableColors.find(x => x[1] === color)
					&& !TEXT_COLORS.find(x => x[1] === color)) {
					availableColors.push(['', color]);
				}
			}
		});

		availableColors.sort((a, b) => a[1] < b[1]);
		availableColors = [...TEXT_COLORS, ...availableColors];
		availableColors = availableColors.slice(0, MAX_AVAILABLE_COLORS);

		let { from, to } = state.selection;

		let marks = [];
		state.doc.nodesBetween(from, to, node => {
			marks = [...marks, ...node.marks];
		});

		marks = [
			...marks,
			...(state.storedMarks || state.selection.$from.marks())
		];

		for (let mark of marks) {
			if (mark.type === schema.marks.textColor) {
				let color = mark.attrs.color;
				color = color.toLowerCase();
				if (!activeColors.includes(color)) {
					activeColors.push(color);
				}
			}
		}

		this.state = {
			availableColors,
			activeColors,
			setColor: this.setColor.bind(this),
			removeColor: this.removeColor.bind(this),
		};
	}

	setColor(color) {
		this.view.focus();
		let { state, dispatch } = this.view;
		updateMarkRangeAtCursor(schema.marks.textColor, { color })(state, dispatch);
	}

	removeColor() {
		this.view.focus();
		let { state, dispatch } = this.view;
		removeMarkRangeAtCursor(schema.marks.textColor)(state, dispatch);
	}
}

export let textColorKey = new PluginKey('text-color');

export function textColor(options) {
	return new Plugin({
		key: textColorKey,
		state: {
			init(config, state) {
				return new Color(state, options);
			},
			apply(tr, pluginState, oldState, newState) {
				return pluginState;
			}
		},
		view: (view) => {
			let pluginState = textColorKey.getState(view.state);
			pluginState.view = view;
			pluginState.update(view.state);
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

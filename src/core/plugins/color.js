import { Plugin, PluginKey } from 'prosemirror-state';
import { Mark } from 'prosemirror-model';
import { schema } from '../schema';
import { removeMarkRangeAtCursor, updateMarkRangeAtCursor } from '../commands';
import { getMarkRange } from '../helpers';

const BACKGROUND_COLORS = [
	['yellow', '#ffd400'],
	['red', '#ff6666'],
	['green', '#5fb236'],
	['blue', '#2ea8e5'],
	['purple', '#a28ae5']
];

const MAX_AVAILABLE_COLORS = 30;

class Color {
	constructor(state, options) {
		this.state = {
			availableColors: BACKGROUND_COLORS,
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
			let mark = node.marks.find(mark => mark.type === schema.marks.backgroundColor);
			if (mark) {
				let color = mark.attrs.color;
				color = color.toLowerCase();
				if (!availableColors.find(x => x[1] === color)
					&& !BACKGROUND_COLORS.find(x => x[1] === color)) {
					availableColors.push(['', color]);
				}
			}
		});

		availableColors.sort((a, b) => a[1] < b[1]);
		availableColors = [...BACKGROUND_COLORS, ...availableColors];
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
			if (mark.type === schema.marks.backgroundColor) {
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
			canApplyAnnotationColors: this.setAnnotationColors(false, true),
			canRemoveAnnotationColors: this.setAnnotationColors(true, true),
			setColor: this.setColor.bind(this),
			removeColor: this.removeColor.bind(this),
			applyAnnotationColors: () => this.setAnnotationColors(false),
			removeAnnotationColors: () => this.setAnnotationColors(true)
		};
	}

	setAnnotationColors(remove, onlyCheck) {
		let { state, dispatch } = this.view;
		let { tr } = state;
		let found = false
		state.doc.descendants((node, pos) => {
			if (node.type === schema.nodes.highlight) {
				let color = node.attrs.annotation.color;
				if (color) {
					let from = pos + 1;
					let to = pos + 1 + node.content.size;

					let $from = state.doc.resolve(from);
					let range = getMarkRange($from, schema.marks.backgroundColor, { color });

					if (remove) {
						if (range && range.from === from && range.to === to) {
							found = true;
							if (onlyCheck) {
								return false;
							}
							tr.removeMark(from, to, schema.marks.backgroundColor);
						}
					}
					else {
						if (!range || range.from !== from || range.to !== to) {
							found = true;
							if (onlyCheck) {
								return false;
							}
							tr.addMark(from, to, schema.marks.backgroundColor.create({ color }));
						}
					}
				}
			}
		});

		if (!onlyCheck) {
			dispatch(tr);
		}
		return found;
	}

	setColor(color) {
		let { state, dispatch } = this.view;
		updateMarkRangeAtCursor(schema.marks.backgroundColor, { color })(state, dispatch);
	}

	removeColor() {
		let { state, dispatch } = this.view;
		removeMarkRangeAtCursor(schema.marks.backgroundColor)(state, dispatch);
	}
}

export let colorKey = new PluginKey('color');

export function color(options) {
	return new Plugin({
		key: colorKey,
		state: {
			init(config, state) {
				return new Color(state, options);
			},
			apply(tr, pluginState, oldState, newState) {
				return pluginState;
			}
		},
		view: (view) => {
			let pluginState = colorKey.getState(view.state);
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

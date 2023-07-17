import { Plugin, PluginKey } from 'prosemirror-state';
import { Mark } from 'prosemirror-model';
import { schema, HIGHLIGHT_COLORS } from '../schema';
import { removeMarkRangeAtCursor, updateMarkRangeAtCursor } from '../commands';
import { getMarkRange } from '../helpers';

const MAX_AVAILABLE_COLORS = 30;

class UnderlineColor {
	constructor(state, options) {
		this.state = {
			availableColors: HIGHLIGHT_COLORS,
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
			let mark = node.marks.find(mark => mark.type === schema.marks.underline);
			if (mark) {
				let color = mark.attrs.color;
				color = color.toLowerCase();
				if (HIGHLIGHT_COLORS.map(x => x[1].slice(0, 7)).includes(color)) {
					color += '80';
				}
				if (!availableColors.find(x => x[1] === color)
					&& !HIGHLIGHT_COLORS.find(x => x[1] === color)) {
					availableColors.push(['', color]);
				}
			}
		});

		availableColors.sort((a, b) => a[1] < b[1]);
		availableColors = [...HIGHLIGHT_COLORS, ...availableColors];
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
			if (mark.type === schema.marks.underline) {
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
			isCursorInUnderline: this.isCursorInUnderline(),
			canApplyAnnotationColors: this.setAnnotationColors(false, true),
			canRemoveAnnotationColors: this.setAnnotationColors(true, true),
			setColor: this.setColor.bind(this),
			removeColor: this.removeColor.bind(this),
			applyAnnotationColors: () => this.setAnnotationColors(false),
			removeAnnotationColors: () => this.setAnnotationColors(true)
		};
	}

	isCursorInUnderline() {
		let { state } = this.view;
		let { $from, $to } = state.selection;
		// Check if the parent node at the start of the selection is a highlight node
		let startInHighlight = $from.parent.type === schema.nodes.underline_annotation;
		// If the selection is a range (not collapsed), also check the end of the selection
		let endInHighlight = $to.pos > $from.pos ? $to.parent.type === schema.nodes.underline_annotation : startInHighlight;
		return startInHighlight && endInHighlight;
	}

	setAnnotationColors(remove, onlyCheck) {
		let { state, dispatch } = this.view;
		let { tr } = state;
		let found = false
		state.doc.descendants((node, pos) => {
			if (node.type === schema.nodes.underline_annotation) {
				let color = node.attrs.annotation.color;
				if (color) {
					let from = pos + 1;
					let to = pos + 1 + node.content.size;

					let $from = state.doc.resolve(from);
					// Try to find color with 50% opacity or fallback to the older color code without opacity
					let range = getMarkRange($from, schema.marks.underline, { color: color + '80' })
						|| getMarkRange($from, schema.marks.underline, { color });

					if (color[0] === '#' && color.length === 9) {
						color = color.slice(0, 7);
					}

					if (remove) {
						if (range && range.from === from && range.to === to) {
							found = true;
							if (onlyCheck) {
								return false;
							}
							tr.removeMark(from, to, schema.marks.underline);
						}
					}
					else {
						if (!range || range.from !== from || range.to !== to) {
							found = true;
							if (onlyCheck) {
								return false;
							}
							tr.addMark(from, to, schema.marks.underline.create({ color }));
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
		this.view.focus();
		let { state, dispatch } = this.view;
		if (color[0] === '#' && color.length === 9) {
			color = color.slice(0, 7);
		}
		updateMarkRangeAtCursor(schema.marks.underline, { color })(state, dispatch);
	}

	removeColor() {
		this.view.focus();
		let { state, dispatch } = this.view;
		removeMarkRangeAtCursor(schema.marks.underline)(state, dispatch);
	}
}

export let underlineColorKey = new PluginKey('underline-color');

export function underlineColor(options) {
	return new Plugin({
		key: underlineColorKey,
		state: {
			init(config, state) {
				return new UnderlineColor(state, options);
			},
			apply(tr, pluginState, oldState, newState) {
				return pluginState;
			}
		},
		view: (view) => {
			let pluginState = underlineColorKey.getState(view.state);
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

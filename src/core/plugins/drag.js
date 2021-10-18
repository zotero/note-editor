import { NodeSelection, Plugin, TextSelection } from 'prosemirror-state';
import { dropPoint } from 'prosemirror-transform';
import { throttle } from '../utils';
import { Slice, Fragment } from 'prosemirror-model';
import { __serializeForClipboard } from 'prosemirror-view';


class Drag {
	constructor(view, options) {
		this.view = view;
		this.node = null;
		this.dragHandleNode = null;
		this.mouseIsDown = false;

		this.handlers = ['mousemove'].map((name) => {
			let handler = (e) => {
				return this[name](e);
			};
			view.dom.addEventListener(name, handler);
			return { name: name, handler: handler };
		});

		window.addEventListener('mouseup', () => {
			this.mouseIsDown = false;
		})

		this.updateDragHandle = throttle(() => {
			let parentRect = this.view.dom.getBoundingClientRect();

			if (!this.node) {
				if (this.dragHandleNode) {
					this.dragHandleNode.style.display = 'none';
				}
				return;
			}
			let rect = this.node.getBoundingClientRect();

			let top = rect.top - parentRect.top;

			if (!this.dragHandleNode) {
				let relativeContainer = document.querySelector('.relative-container');
				if (!relativeContainer) return;
				this.dragHandleNode = document.createElement('div');
				this.dragHandleNode.className = 'drag-handle';
				this.dragHandleNode.draggable = true;

				this.dragHandleNode.addEventListener('mousedown', (event) => {
					this.mouseIsDown = true;
				});

				this.dragHandleNode.addEventListener('dragstart', (event) => {
					let pos = this.view.posAtDOM(this.node, 0) - 1;
					let node = this.view.state.tr.doc.nodeAt(pos);
					let $from = this.view.state.tr.doc.resolve(pos);

					this.view.dispatch(this.view.state.tr.setSelection(new NodeSelection($from)));

					// TODO: Consider using decorations to change background color when block drag handle is hovered

					let slice = new Slice(new Fragment([node]), 0, 0);
					let ref = __serializeForClipboard(this.view, slice);
					var dom = ref.dom;
					var text = ref.text;
					event.dataTransfer.setDragImage(new Image(), 0, 0);
					event.dataTransfer.clearData();
					event.dataTransfer.setData('text/html', dom.innerHTML);
					event.dataTransfer.effectAllowed = 'copyMove';
					event.dataTransfer.setData('text/plain', text);

					this.view.dragging = { slice, move: true };
				});

				this.dragHandleNode.addEventListener('dragend', (event) => {
					this.mouseIsDown = false;
					let { to } = this.view.state.selection;
					this.view.dispatch(this.view.state.tr.setSelection(TextSelection.create(this.view.state.tr.doc, to - 1)));
					this.dragHandleNode.style.display = 'none';
					// Work around Firefox bug causing caret disappearance
					// https://github.com/ProseMirror/prosemirror/issues/1113
					setTimeout(() => {
						this.view.dom.blur();
						this.view.dom.focus()
					},0);
				});

				relativeContainer.append(this.dragHandleNode);
			}

			let padding = rect.left - parentRect.left - 4;
			if (document.getElementsByTagName("html")[0].dir === 'rtl') {
				padding = parentRect.right - rect.right;
			}

			if (this.node.nodeName === 'LI') {
				padding += 22;
			}

			if (document.getElementsByTagName("html")[0].dir === 'rtl') {
				this.dragHandleNode.style.right = padding - 22 + 'px';
			}
			else {
				this.dragHandleNode.style.left = padding - 22 + 'px';
			}

			this.dragHandleNode.style.display = 'block';
			this.dragHandleNode.style.top = top - 2 + 'px';
		}, 50);
	}

	destroy() {
		this.handlers.forEach((name, handler) => {
			return this.editorView.dom.removeEventListener(name, handler);
		});
	}


	mousemove(event) {
		if (this.mouseIsDown) {
			return;
		}

		// When dragging outside of iframe DropCursorView.prototype.dragleave throws
		// "TypeError: Argument 1 of Node.contains does not implement interface Node."
		let topNode = null;

		let node = event.target;

		if (node.nodeType !== Node.ELEMENT_NODE || !this.view.dom.contains(node)) {
			return;
		}

		while (node && node.parentNode !== this.view.dom && node.nodeName !== 'LI') {
			node = node.parentNode;
		}

		if (node) {
			if (['UL', 'OL'].includes(node.nodeName)) {
				node = node.firstElementChild;
			}


			if (node.nodeName === 'LI') {
				let node2 = node;

				while (node2 && node2 !== this.view.dom) {
					if (!['LI', 'OL', 'UL', 'P'].includes(node2.nodeName)) {
						node = null;
						break;
					}
					node2 = node2.parentNode;
				}
			}
		}


		this.node = node;

		this.updateDragHandle();
	}
}

export function drag(options = {}) {
	return new Plugin({
		view(view) {
			return new Drag(view, options);
		}
	});
}

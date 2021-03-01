import { NodeSelection, Plugin } from 'prosemirror-state';
import { dropPoint } from 'prosemirror-transform';
import { throttle } from '../utils';
import { Slice, Fragment } from 'prosemirror-model';


class Drag {
	constructor(view, options) {
		this.view = view;
		this.node = null;
		this.dragHandleNode = null;

		this.handlers = ['mousemove'].map((name) => {
			let handler = (e) => {
				return this[name](e);
			};
			view.dom.addEventListener(name, handler);
			return { name: name, handler: handler };
		});

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
			let left = rect.left;

			if (!this.dragHandleNode) {
				let relativeContainer = document.querySelector('.relative-container');
				if (!relativeContainer) return;
				this.dragHandleNode = document.createElement('div');
				this.dragHandleNode.className = 'drag-handle';
				this.dragHandleNode.draggable = true;
				this.dragHandleNode.addEventListener('dragstart', (event) => {
					event.dataTransfer.setData('text/plain', null);
					event.dataTransfer.setDragImage(new Image(), 0, 0);

					let pos = this.view.posAtDOM(this.node, 0) - 1;
					let nnn = this.view.state.tr.doc.nodeAt(pos);
					let $from = this.view.state.tr.doc.resolve(pos);

					this.view.dispatch(this.view.state.tr.setSelection(new NodeSelection($from)));
					let slice = new Slice(new Fragment([nnn]), 0, 0);
					this.view.dragging = { slice, move: true };
				});

				this.dragHandleNode.addEventListener('dragend', (event) => {
					this.view.dispatch(this.view.state.tr.setSelection(TextSelection.create(this.view.state.tr.doc, 0)));
					this.dragHandleNode.style.display = 'none';
				});

				relativeContainer.append(this.dragHandleNode);
			}

			if (this.node.nodeName === 'LI') {
				left += 22;
			}

			this.dragHandleNode.style.display = 'block';
			this.dragHandleNode.style.top = top - 2 + 'px';
			this.dragHandleNode.style.left = left - 22 + 'px';
		}, 50);
	}

	destroy() {
		this.handlers.forEach((name, handler) => {
			return this.editorView.dom.removeEventListener(name, handler);
		});
	}


	mousemove(event) {
		let topNode = null;

		let node = event.target;

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

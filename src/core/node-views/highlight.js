import { StepMap } from 'prosemirror-transform'
import { keymap } from 'prosemirror-keymap'
import { undo, redo } from 'prosemirror-history'
import { EditorView } from 'prosemirror-view';
import { EditorState } from 'prosemirror-state';
import { DOMSerializer, Fragment } from 'prosemirror-model';
import { schema } from '../schema';

class HighlightView {
  constructor(node, view, getPos, options) {
    this.node = node
    this.outerView = view
    this.getPos = getPos;

    this.editing = false;

    this.dom = document.createElement('span');
    this.dom.className = 'highlight'
    this.previewNode = document.createElement('span');
    this.editNode = document.createElement('span');
    this.editNode.classList.add('hidden');

    this.dom.appendChild(this.previewNode);
    this.dom.appendChild(this.editNode);

    let p = DOMSerializer.fromSchema(schema).serializeFragment(this.node);
    this.previewNode.appendChild(p);


    // this.dom = dom;
    // this.dom.appendChild(dom)
    this.innerView = null

    this.onDestruct = options.onDestruct;
    options.onConstruct(this);

    this.dom.onclick = event => {
      event.preventDefault();
      options.onClick(node);
    }

  }

  selectNode() {
    this.dom.classList.add('ProseMirror-selectednode')
    // if (!this.innerView) this.open()
  }

  deselectNode() {
    this.dom.classList.remove('ProseMirror-selectednode')
    if (this.innerView) this.close()
  }

  open() {
    this.dom.classList.add('editing');
    this.dom.draggable = false;
    this.previewNode.classList.add('hidden');
    this.editNode.classList.remove('hidden');
    this.innerView = new EditorView({ mount: this.editNode }, {
      attributes: {
        class: 'aaa'
      },
      state: EditorState.create({
        doc: this.node,
        plugins: [keymap({
          'Mod-z': () => undo(this.outerView.state, this.outerView.dispatch),
          'Mod-y': () => redo(this.outerView.state, this.outerView.dispatch)
        })]
      }),
      // This is the magic part
      dispatchTransaction: this.dispatchInner.bind(this),
      handleDOMEvents: {
        mousedown: (view, event) => {
          if (this.outerView.hasFocus()) this.innerView.focus()
          // event.stopPropagation()
        },
        dragstart: (view, event) => {
          event.preventDefault();
        }
      }
    })
  }

  close() {
    this.dom.classList.remove('editing');
    this.previewNode.classList.remove('hidden');
    this.editNode.classList.add('hidden');
    this.innerView.destroy()
    this.innerView = null;
    this.dom.draggable = true;
    // this.dom.textContent = "()"
  }

  dispatchInner(tr) {
    let { state, transactions } = this.innerView.state.applyTransaction(tr)
    this.innerView.updateState(state)

    if (!tr.getMeta('fromOutside')) {
      let outerTr = this.outerView.state.tr, offsetMap = StepMap.offset(this.getPos() + 1)
      for (let i = 0; i < transactions.length; i++) {
        let steps = transactions[i].steps
        for (let j = 0; j < steps.length; j++)
          outerTr.step(steps[j].map(offsetMap))
      }
      if (outerTr.docChanged) this.outerView.dispatch(outerTr)
    }
  }

  update(node) {
    if (!node.sameMarkup(this.node)) return false
    this.node = node;

    let dom = DOMSerializer.fromSchema(schema).serializeFragment(this.node);
    this.previewNode.innerHTML = '';
    this.previewNode.appendChild(dom);
    if (this.innerView) {
      let state = this.innerView.state
      let start = node.content.findDiffStart(state.doc.content)
      if (start != null) {
        let { a: endA, b: endB } = node.content.findDiffEnd(state.doc.content)
        let overlap = start - Math.min(endA, endB)
        if (overlap > 0) {
          endA += overlap;
          endB += overlap
        }
        this.innerView.dispatch(
          state.tr
          .replace(start, endB, node.slice(start, endA))
          .setMeta('fromOutside', true))
      }
    }
    return true
  }

  destroy() {
    if (this.innerView) this.close()
    this.onDestruct(this);
  }

  stopEvent(event) {
    if (!this.editNode.classList.contains('hidden')) {
      // event.stopPropagation();
      // event.preventDefault();
      return true;
    }
    return this.innerView && this.innerView.dom.contains(event.target)
  }

  ignoreMutation() {
    return true
  }
}


export default function (options) {
  return function (node, view, getPos) {
    return new HighlightView(node, view, getPos, options);
  }
}

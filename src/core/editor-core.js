import { EditorState } from 'prosemirror-state'
import { EditorView } from 'prosemirror-view'
import { schema, toHtml, clipboardSerializer } from './schema'
import { DOMSerializer } from 'prosemirror-model'
import { TextSelection } from 'prosemirror-state'
import { DOMParser as DOMParser2, Pos, Node } from 'prosemirror-model'
import { debounce, decodeObject, encodeObject, generateObjectKey, randomString } from './utils'


import nodeViews from './node-views'
import { insertAnnotationsAndCitations, insertCitations } from './commands';
import { columnResizing, tableEditing } from 'prosemirror-tables';

import { dropCursor } from 'prosemirror-dropcursor';
import { menu, menuKey } from './plugins/menu';
import { link, linkKey } from './plugins/link';
import { search, searchKey } from './plugins/search'
import { image, imageKey } from './plugins/image'

import { gapCursor } from 'prosemirror-gapcursor';
import { keymap } from 'prosemirror-keymap';
import { history } from 'prosemirror-history';
import { citation, _setFormattedCitations, _updateCitation } from './plugins/citation';
import { buildKeymap } from './keymap';
import { baseKeymap } from 'prosemirror-commands';
import { buildInputRules } from './input-rules';
import { highlight } from './plugins/highlight';
import { trailingParagraph } from './plugins/trailing-paragraph';

class EditorCore {
  constructor(options) {
    this.readOnly = options.readOnly;
    this.onUpdate = options.onUpdate;
    this.onUpdateCitations = options.onUpdateCitations;
    this.onInsertObject = options.onInsertObject;
    this.onNavigate = options.onNavigate;
    this.onOpenCitationPopup = options.onOpenCitationPopup;
    this.onUpdateImages = options.onUpdateImages;
    this.onRequestImage = options.onRequestImage;
    this.onGetFormattedCitations = options.onGetFormattedCitations;


    this.lastMouseDownNode = null;

    this.docChanged = false;

    let prevHTML = null;
    let updateNote = debounce(() => {
      let html = this.getHtml() || null;
      if (html !== prevHTML) {
        prevHTML = html;
        this.onUpdate(html);
      }
    }, 1000);

    let doc;

    if (typeof options.value === 'string') {
      doc = DOMParser2.fromSchema(schema).parse((new DOMParser().parseFromString(options.value, 'text/html').body));
    }
    else if (typeof options.value === 'object') {
      doc = Node.fromJSON(schema, options.value.doc);
    }
    if (!doc) return;
    let that = this;
    this.view = new EditorView(null, {
      editable: () => !this.readOnly,
      attributes: {
        'spellcheck': false
      },
      state: EditorState.create({
        doc,
        plugins: [
          columnResizing(),
          tableEditing(),
          buildInputRules(schema),
          keymap(buildKeymap(schema)),
          keymap(baseKeymap),
          highlight({
            onDoubleClick: (node) => {
              if (this.readOnly) return;
              this.onNavigate(node.attrs.annotation);
            }
          }),
          citation({
            onClick: (node) => {
              if (this.readOnly || !node.attrs.id) return;
              this.onOpenCitationPopup(node.attrs.id, node.attrs.citation);
            },
            onGetFormattedCitations: this.onGetFormattedCitations
          }),
          image({
            onUpdateImages: this.onUpdateImages,
            onRequestImage: this.onRequestImage,
            onDoubleClick: (node) => {
              if (this.readOnly) return;
              this.onNavigate(node.attrs.annotation);
            }
          }),
          dropCursor(),
          gapCursor(),
          menu(),
          search(),
          link(),
          trailingParagraph(),
          history()
        ]
      }),
      clipboardSerializer,
      nodeViews,
      dispatchTransaction(transaction) {
        let newState = this.state.apply(transaction)
        if (transaction.docChanged
          && toHtml(this.state.doc.content) !== toHtml(newState.doc.content)) {
          that.docChanged = true;
          updateNote();
        }
        this.updateState(newState);

        that.updatePluginState(this.state);
        that.onUpdateState && that.onUpdateState();
      },
      handleDOMEvents: {
        paste: (view, event) => {
          if (this.readOnly) {
            event.preventDefault();
            return;
          }
          let data;
          if (data = event.clipboardData.getData('zotero/annotation')) {
            event.preventDefault();
            this.onInsertObject('zotero/annotation', data);
          }
        },
        drop: (view, event) => {
          if (this.readOnly) {
            event.preventDefault();
            return;
          }
          let pos = view.posAtCoords({ left: event.clientX, top: event.clientY });
          let data;
          if (data = event.dataTransfer.getData('zotero/annotation')) {
            event.preventDefault();
            this.onInsertObject('zotero/annotation', data, pos.pos);
          }
          else if (data = event.dataTransfer.getData('zotero/item')) {
            event.preventDefault();
            this.onInsertObject('zotero/item', data, pos.pos);
          }
        },
        mousedown: (view, event) => {
          if (event.button === 2) {
            this.lastMouseDownNode = event.target;
          }
        }
      }
    });

    this.view.editorCore = this;

    this.updatePluginState(this.view.state);

  }

  updatePluginState(state) {
    this.pluginState = {
      menu: menuKey.getState(state),
      link: linkKey.getState(state),
      search: searchKey.getState(state)
    }
  }

  setFormattedCitations(citationPreviews) {
    _setFormattedCitations(citationPreviews)(this.view.state, this.view.dispatch);
  }

  updateCitation(id, citation, formattedCitation) {
    _updateCitation(id, citation, formattedCitation)(this.view.state, this.view.dispatch);
  }

  insertCitations(citations, pos) {
    insertCitations(citations, pos)(this.view.state, this.view.dispatch);
  }

  insertAnnotationsAndCitations(list, pos) {
    insertAnnotationsAndCitations(list, pos)(this.view.state, this.view.dispatch);
  }

  getHtml() {
    return toHtml(this.view.state.doc.content);
  };

  updateImage(attachmentKey, dataUrl) {
    let pluginState = imageKey.getState(this.view.state);
    pluginState.updateImage(attachmentKey, dataUrl);
  }

}

export default EditorCore;

import applyDevTools from 'prosemirror-dev-tools';
import { EditorState, Plugin } from 'prosemirror-state'
import { EditorView } from 'prosemirror-view'
import { schema, toHtml, buildClipboardSerializer } from './schema'
import { DOMSerializer } from 'prosemirror-model'
import { TextSelection } from 'prosemirror-state'
import { DOMParser as DOMParser2, Pos, Node } from 'prosemirror-model'
import { debounce, decodeObject, encodeObject, randomString } from './utils'


import nodeViews from './node-views'
import { attachImportedImage, insertAnnotationsAndCitations, setCitation } from './commands';
import { columnResizing, tableEditing } from 'prosemirror-tables';

import { dropCursor } from 'prosemirror-dropcursor';
import { menu, menuKey } from './plugins/menu';
import { link, linkKey } from './plugins/link';
import { search, searchKey } from './plugins/search'
import { image, imageKey } from './plugins/image'

import { gapCursor } from 'prosemirror-gapcursor';
import { keymap } from 'prosemirror-keymap';
import { history } from 'prosemirror-history';
import { buildKeymap } from './keymap';
import { baseKeymap } from 'prosemirror-commands';
import { buildInputRules } from './input-rules';
import { highlight } from './plugins/highlight';
import { trailingParagraph } from './plugins/trailing-paragraph';
import { nodeId } from './plugins/node-id';
import Provider from './provider';
import { schemaTransform, digestHtml } from './schema/transformer';
import { readOnly } from './plugins/read-only';
import { transform } from './plugins/schema-transform';
import { dropPaste } from './plugins/drop-paste';

class EditorCore {
  constructor(options) {
    this.readOnly = options.readOnly;
    this.docChanged = false;
    this.dimensionsStore = { data: {} };
    this.unsupportedSchema = false;

    this.provider = new Provider({
      onSubscribe: options.onSubscribeProvider,
      onUnsubscribe: options.onUnsubscribeProvider
    });

    let clipboardSerializer = buildClipboardSerializer(this.provider, schema);

    let prevHTML = null;
    let updateNote = debounce(() => {
      if (this.readOnly) {
        return;
      }
      let html = this.getHtml() || null;
      if (html !== prevHTML) {
        prevHTML = html;
        options.onUpdate(html);
      }
    }, 1000);

    let doc;


    if (typeof options.value === 'string') {
      let { html, metadata } = digestHtml(options.value);
      options.value = html;
      if (metadata.schemaVersion > schema.version) {
        this.unsupportedSchema = true;
        this.readOnly = true;
      }
      console.log({ metadata })
      doc = DOMParser2.fromSchema(schema).parse((new DOMParser().parseFromString(options.value, 'text/html').body));
    }
    else if (typeof options.value === 'object') {
      doc = Node.fromJSON(schema, options.value.doc);
    }
    if (!doc) return;


    let state = EditorState.create({ doc });
    let tr = schemaTransform(state);
    if (tr) {
      state = state.apply(tr);
      doc = state.doc;
    }

    let that = this;
    this.view = new EditorView(null, {
      editable: () => !this.readOnly,
      attributes: {
        // 'spellcheck': false
      },
      state: EditorState.create({
        doc,
        plugins: [
          readOnly({ enable: this.readOnly }),
          dropPaste({
            onInsertObject: options.onInsertObject
          }),
          transform(),
          nodeId(),
          buildInputRules(schema),
          keymap(buildKeymap(schema)),
          keymap(baseKeymap),
          highlight({
            onDoubleClick: (node) => {
              if (node.attrs.annotation) {
                options.onOpenAnnotation(node.attrs.annotation);
              }
            }
          }),
          image({
            dimensionsStore: this.dimensionsStore,
            onSyncAttachmentKeys: options.onSyncAttachmentKeys,
            onImportImages: options.onImportImages
          }),
          dropCursor(),
          gapCursor(),
          menu(),
          search(),
          link({
            onOpenUrl: options.onOpenUrl.bind(this)
          }),
          trailingParagraph(),
          // columnResizing(),
          tableEditing(),
          history()
        ]
      }),
      clipboardSerializer,
      nodeViews: {
        image: nodeViews.image({
          provider: this.provider,
          onDimensions: (node, width, height) => {
            // TODO: Dimension can also be updated if user modified the document just seconds a go
            this.dimensionsStore.data[node.attrs.nodeId] = [width, height];
          },
          onOpenUrl: options.onOpenUrl.bind(this),
          onDoubleClick: (node) => {
            if (node.attrs.annotation) {
              options.onOpenAnnotation(node.attrs.annotation);
            }
          }
        }),
        citation: nodeViews.citation({
          provider: this.provider,
          onClick: (node) => {
            if (!node.attrs.nodeId) return;
            options.onOpenCitationPopup(node.attrs.nodeId, node.attrs.citation);
          }
        })
      },
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
        mousedown: (view, event) => {
          if (event.button === 2) {
            let pos = view.posAtCoords({ left: event.clientX, top: event.clientY });
            if (pos) {
              let $pos = view.state.doc.resolve(pos.pos);
              setTimeout(() => {
                options.onOpenContextMenu($pos.pos, $pos.node(), event.screenX, event.screenY);
              }, 0);
            }
          }
        }
      }
    });

    // DevTools might freeze the editor and throw random errors
    // applyDevTools(this.view);
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

  setCitation(nodeId, citation) {
    setCitation(nodeId, citation)(this.view.state, this.view.dispatch);
  }

  attachImportedImage(nodeId, attachmentKey) {
    attachImportedImage(nodeId, attachmentKey)(this.view.state, this.view.dispatch);
  }

  insertAnnotationsAndCitations(list, pos) {
    insertAnnotationsAndCitations(list, pos)(this.view.state, this.view.dispatch);
  }

  hasSelection() {
    let selection = this.view.state.doc.cut(
      this.view.state.selection.from,
      this.view.state.selection.to
    );
    return selection.content.size > 0;
  }

  getHtml() {
    return toHtml(this.view.state.doc.content);
  };

  focus() {
    this.view.focus();
  }

  getData(onlyChanged) {
    if (onlyChanged && !this.docChanged) {
      return null;
    }

    return {
      state: {
        doc: this.view.state.doc.toJSON()
      },
      html: this.getHtml() || null
    };
  }
}

export default EditorCore;

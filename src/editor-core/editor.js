import { EditorState } from 'prosemirror-state'
import { EditorView } from 'prosemirror-view'
import { schema } from './schema'
import { baseKeymap } from 'prosemirror-commands'
import { addListNodes } from 'prosemirror-schema-list'
import { dropCursor } from 'prosemirror-dropcursor'
import { gapCursor } from 'prosemirror-gapcursor'
import { menuBar } from 'prosemirror-menu'
import { history } from 'prosemirror-history'
import { DOMSerializer } from 'prosemirror-model'

import { buildMenuItems } from './menu'
import { buildKeymap } from './keymap'
import { buildInputRules } from './inputrules'

import { toggleMark } from 'prosemirror-commands'

import { TextSelection } from 'prosemirror-state'

window.TextSelection = TextSelection;

import * as commands from './commands'

// import {buildInputRules, buildKeymap, buildMenuItems, exampleSetup} from "./editor"
import { DOMParser as DOMParser2, Pos, Node } from 'prosemirror-model'
import { randomString } from './utils'

// import {addColumnAfter, addColumnBefore, deleteColumn, addRowAfter, addRowBefore, deleteRow,
//         mergeCells, splitCell, setCellAttr, toggleHeaderRow, toggleHeaderColumn, toggleHeaderCell,
//         goToNextCell, deleteTable}  from "prosemirror-tables/commands"

import { tableEditing, columnResizing, tableNodes, fixTables } from 'prosemirror-tables'

import { keymap } from 'prosemirror-keymap'

import menububble from './menububble';

import ss from './fr'

let parser = (content) => {
  let domNode = document.createElement('div');
  domNode.innerHTML = content;
  let fragment = document.createDocumentFragment();
  while (domNode.firstChild) {
    fragment.appendChild(domNode.firstChild);
  }
  return DOMParser2.fromSchema(schema).parse(fragment);
};

function getCurrentHref() {
  let $pos = editor.state.selection.$from;
  let start = $pos.parent.childAfter($pos.parentOffset);
  if (start.node) {
    let mark = start.node.marks.find(mark => mark.type.name === 'link');
    if (mark) {
      return mark.attrs.href;
    }
  }
  return null;
}

let editor;

let prevCitations = [];

let readOnly = false;

window.rtl = false;

function getCitations() {
  let citations = [];
  editor.state.doc.descendants((node, pos) => {
    if (node.type.name === 'citation' && node.attrs.citation /*&& node.attrs.items.length*/) {
      // citations.push(node.attrs.itemIds.sort());
      if (node.attrs.id && node.attrs.citation) {
        citations.push({
          citationID: node.attrs.id,
          citationItems: node.attrs.citation.citationItems,
          properties: node.attrs.citation.properties
        });
      }
    }
  });

  return citations;
}

class CitationView {
  constructor(node, view, getPos) {
    // The editor will use this as the node's DOM representation
    this.dom = document.createElement('span')
    this.dom.className = 'citation';
    this.dom.setAttribute('data-id', node.attrs.id);
    this.dom.setAttribute('data-citation', encodeURIComponent(JSON.stringify(node.attrs.citation)));
    this.dom.innerHTML = node.attrs.content;
  }

  selectNode() {
    this.dom.classList.add('selected');
  }

  deselectNode() {
    this.dom.classList.remove('selected');
  }

  update(node) {
    if (node.type.name !== 'citation') return;
    this.dom.innerHTML = node.attrs.content;
    this.dom.setAttribute('data-id', node.attrs.id);
    this.dom.setAttribute('data-citation', encodeURIComponent(JSON.stringify(node.attrs.citation)));
    return true
  }

  // stopEvent(event) {
  // 	return true
  // }
}

function debounce(func, wait, immediate) {
  var timeout;
  return function () {
    var context = this, args = arguments;
    var later = function () {
      timeout = null;
      if (!immediate) func.apply(context, args);
    };
    var callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) func.apply(context, args);
  };
};

class EditorCore {

  constructor(options) {
    this.onUpdate = options.onUpdate;
    this.onOpenUrl = options.onOpenUrl;
    this.onUpdateCitations = options.onUpdateCitations;
    this.onInsertObject = options.onInsertObject;
    this.onNavigate = options.onNavigate;
    this.onOpenCitationPopup = options.onOpenCitationPopup;

    this.lastMouseDownNode = null;

    if (editor) {
      editor.destroy();
    }
    window.editor = editor;
    window.docChanged = false;
    ss.searchTerm = null;

    let edd = document.getElementById('editor-container')

    let menuBubbleNode = document.querySelector('.menububble');

    if (!menuBubbleNode) {
      menuBubbleNode = document.createElement('div');
      menuBubbleNode.className = 'menububble';
      edd.appendChild(menuBubbleNode);
    }
    menuBubbleNode.addEventListener('mousedown', (event) => {
      // event.preventDefault();
      event.stopPropagation();
    })
    menuBubbleNode.innerHTML = '<input id="link-bubble-input" type="edit" placeholder="Enter URL"><button id="link-bubble-remove">Unlink</button><button id="link-bubble-open">Open</button><button id="link-bubble-set">Set</button>';
    document.getElementById('link-bubble-input').addEventListener('keydown', (event) => {
      if (event.which == 13 || event.keyCode == 13) {

        let href = getCurrentHref();
        let selected = editor.state.selection.$from !== editor.state.selection.$to;

        if (href && !selected) {
          updateMark(schema.marks.link, { href: event.target.value })(editor.state, editor.dispatch);
        }
        else if (!href && selected) {
          toggleMark(schema.marks.link, { href: event.target.value })(editor.state, editor.dispatch);
        }
        return false;
      }
    });

    window.menuBubbleNode = menuBubbleNode;

    document.getElementById('link-bubble-set').addEventListener('click', (event) => {
      let value = document.getElementById('link-bubble-input').value;
      toggleMark(schema.marks.link, { href: value })(editor.state, editor.dispatch);
    });

    document.getElementById('link-bubble-remove').addEventListener('click', (event) => {
      removeMark(schema.marks.link)(editor.state, editor.dispatch);
    });

    document.getElementById('link-bubble-open').addEventListener('click', (event) => {

      let $pos = editor.state.selection.$from;
      let start = $pos.parent.childAfter($pos.parentOffset);
      if (start.node) {
        let mark = start.node.marks.find(mark => mark.type.name === 'link');
        if (mark) {
          let href = mark.attrs.href;
          // console.log(href);
          // window.open(href, '_blank');
          // query('openURL', { url: href });
          this.onOpenUrl(href);

        }
      }

    });


    let plugins = [
      // columnResizing(),
      tableEditing(),
      buildInputRules(schema),
      keymap(buildKeymap(schema)),
      keymap(baseKeymap),
      dropCursor(),
      gapCursor(),
      ...ss.plugins,
      menububble({
        element: menuBubbleNode, onUpdate(data) {

          view.state.daata = data;

          // let selection = editor.state.doc.cut(editor.state.selection.from, editor.state.selection.to)

          let href = getCurrentHref();

          let visible = false;
          if (editor.state.selection.empty || window.ooo) {

            if (href !== null || window.ooo) {
              window.ooo = null;
              visible = true;
            }
          }

          if (href === null && !editor.state.selection.empty) {
            document.getElementById('link-bubble-set').style.display = 'inline';
            document.getElementById('link-bubble-remove').style.display = 'none';
            document.getElementById('link-bubble-open').style.display = 'none';
          }
          else {
            document.getElementById('link-bubble-set').style.display = 'none';
            document.getElementById('link-bubble-remove').style.display = 'inline';
            document.getElementById('link-bubble-open').style.display = 'inline';
          }

          menuBubbleNode.style.visibility = visible ? 'visible' : 'hidden';

          menuBubbleNode.style.left = data.left + 'px';
          menuBubbleNode.style.bottom = data.bottom + 'px';


          document.getElementById('link-bubble-input').value = href;

          if (visible) {
            setTimeout(() => {
              document.getElementById('link-bubble-input').focus();
            }, 0)
          }
        }
      }),
      keymap({
        'Ctrl-m': ss.commands().find('test'),
        'Ctrl-shift-m': ss.commands().replace('test3')
      }),
      //menuBar({ floating: true, content: buildMenuItems(schema).fullMenu }),
      history()
    ];

    window.dd = function () {
      let data = editor.state.doc.toJSON();
      data.content.concat(data.content);
      editor.state.doc.constructor.fromJSON(schema, data)

    }
    // let gg = {"type":"doc","content":[{"type":"paragraph","attrs":{"indentLevel":null,"align":""}},{"type":"paragraph","attrs":{"indentLevel":null,"align":""}},{"type":"paragraph","attrs":{"indentLevel":null,"align":""}},{"type":"paragraph","attrs":{"indentLevel":null,"align":""},"content":[{"type":"citation","attrs":{"itemIds":[133,146],"content":"{citation}"},"content":[{"type":"text","text":"(Magalhães, n.d.)"}]}]},{"type":"heading","attrs":{"level":2,"align":""},"content":[{"type":"text","text":"errrrrrtytytytyty"}]},{"type":"paragraph","attrs":{"indentLevel":null,"align":"left"},"content":[{"type":"text","text":"eeeeeeee"},{"type":"text","marks":[{"type":"strong"}],"text":"wwwwwwwwwwww"},{"type":"text","text":"eeeeeeeebbbbbb"}]},{"type":"heading","attrs":{"level":1,"align":"center"},"content":[{"type":"text","text":"test"}]},{"type":"table","content":[{"type":"table_row","content":[{"type":"table_cell","attrs":{"colspan":1,"rowspan":1,"colwidth":null,"background":null},"content":[{"type":"text","text":"nnnnggggggggbb"}]}]}]},{"type":"paragraph","attrs":{"indentLevel":null,"align":"left"},"content":[{"type":"text","text":"evvv3333333vvvvv"}]},{"type":"paragraph","attrs":{"indentLevel":null,"align":""}},{"type":"blockquote","content":[{"type":"paragraph","attrs":{"indentLevel":null,"align":""},"content":[{"type":"text","text":"wwwwwwwrrrrrrrrrr"}]}]},{"type":"paragraph","attrs":{"indentLevel":null,"align":""}},{"type":"paragraph","attrs":{"indentLevel":null,"align":""}},{"type":"bullet_list","content":[{"type":"list_item","content":[{"type":"paragraph","attrs":{"indentLevel":null,"align":"left"},"content":[{"type":"text","text":"we111111111111111111111111rwer"}]}]}]},{"type":"paragraph","attrs":{"indentLevel":null,"align":""}},{"type":"paragraph","attrs":{"indentLevel":null,"align":""},"content":[{"type":"text","marks":[{"type":"textColor","attrs":{"textColor":"red"}},{"type":"backgroundColor","attrs":{"backgroundColor":"gray"}}],"text":"werwerwerwer"},{"type":"text","text":"asdfsd"}]},{"type":"paragraph","attrs":{"indentLevel":null,"align":""},"content":[{"type":"text","text":"test "},{"type":"citation","attrs":{"itemIds":[110,111,112],"content":"{citation}"},"content":[{"type":"text","text":"another citation"}]},{"type":"text","text":" ewrwerwe"}]},{"type":"table","content":[{"type":"table_row","content":[{"type":"table_cell","attrs":{"colspan":1,"rowspan":1,"colwidth":null,"background":null},"content":[{"type":"text","text":"sddddfsd"}]},{"type":"table_cell","attrs":{"colspan":1,"rowspan":1,"colwidth":null,"background":null},"content":[{"type":"text","text":"wewww"}]}]}]}]};
    let prevHTML = null;
    let updateNote = debounce(() => {
      let state = {
        doc: editor.state.doc.toJSON()
        // doc: 'kii'
      };

      let html = this.getHTML() || null;

      if (html != prevHTML) {
        prevHTML = html;
        // query('update', {});
        this.onUpdate();
      }
    }, 1000);

    let doc;

    if (options.html !== null) {
      doc = DOMParser2.fromSchema(schema).parse((new DOMParser().parseFromString(options.html, 'text/html').body));
    }
    else if (options.state) {
      doc = Node.fromJSON(schema, options.state.doc);
    }
    if (!doc) return;
    this.view = window.editor = editor = window.view = new EditorView(options.container, {
      state: EditorState.create({
        // doc: DOMParser2.fromSchema(schema).parse((new DOMParser().parseFromString(html, "text/html").body)),
        // doc: Node.fromJSON(schema, gg),
        doc,
        plugins: plugins
      }),
      nodeViews: {
        citation(node, view, getPos) {
          return new CitationView(node, view, getPos)
        }
      },
      dispatchTransaction: (transaction) => {

        console.log('Document size went from', transaction.before.content.size,
          'to', transaction.doc.content.size)

        if (transaction.steps.length && readOnly) {
          // return;
        }

        let newState = view.state.apply(transaction)

        view.updateState(newState);

        if (transaction.steps.length) {

          this.initCitations(transaction.doc);
          // transaction.setMeta('addToHistory', false);
        }

        let citations = getCitations();
        if (citations.length && JSON.stringify(citations) !== JSON.stringify(prevCitations)) {
          prevCitations = citations;

          // query('updateCitations', { citations });
          this.onUpdateCitations(citations)
        }

        if (transaction.docChanged) {
          window.docChanged = true;
          updateNote();
        }

        options.onUpdateView && options.onUpdateView(view);
      },

      handleDOMEvents: {
        paste: (view, event) => {
          if (readOnly) {
            event.preventDefault();
            return;
          }
          // let pos = view.state.selection.$anchor;

          console.log(event.clipboardData.getData('text/plain'))

          let data;
          if (data = event.clipboardData.getData('zotero/annotation')) {
            event.preventDefault();
            this.onInsertObject('zotero/annotation', data);
            // process(data, view);
          }
        },
        drop: (view, event) => {
          if (readOnly) {
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
        click: (view, event) => {
          if (readOnly) {
            event.preventDefault();
            return;
          }
          let citationNode = event.target.closest('.citation');
          if (citationNode) {
            let id = citationNode.getAttribute('data-id');
            let citation = JSON.parse(decodeURIComponent(citationNode.getAttribute('data-citation')));

            // let res = await query('quickFormat', { id, citation });
            this.onOpenCitationPopup(id, citation);


          }
        },
        dblclick: (view, event) => {
          if (readOnly) {
            event.preventDefault();
            return;
          }
          // let citationNode = event.target.closest('.citation');
          // console.log(citationNode);
          // if (citationNode) {
          // 	let itemIds = JSON.parse(citationNode.getAttribute('data-item-ids+++++++++++++++'));
          // 	console.log(itemIds);
          // 	query('open', {itemId: itemIds[0]});
          // }

          let highlightNode = event.target.closest('.highlight');
          if (highlightNode) {
            let uri = highlightNode.getAttribute('data-item-uri');
            let annotation = JSON.parse(decodeURIComponent(highlightNode.getAttribute('data-annotation')));
            view.dispatch(view.state.tr.setSelection(new TextSelection(view.state.tr.selection.$from, view.state.tr.selection.$from)));
            this.onNavigate(uri, annotation.position);
          }

          let areaNode = event.target;
          console.log(areaNode)
          if (areaNode && areaNode.nodeName === 'IMG') {
            let uri = areaNode.getAttribute('data-item-uri');
            let annotation = JSON.parse(decodeURIComponent(areaNode.getAttribute('data-annotation')));
            view.dispatch(view.state.tr.setSelection(new TextSelection(view.state.tr.selection.$from, view.state.tr.selection.$from)));
            this.onNavigate(uri, annotation.position);
          }

        },
        mousedown: (view, event) => {
          this.lastMouseDownNode = event.target;
        }
      }
    });

    if (options.html) {
      let citations = getCitations();
      if (citations.length) {
        // query('updateCitations', { citations });
        this.onUpdateCitations(citations);
      }
    }
    document.querySelector('.ProseMirror').setAttribute('contenteditable', !readOnly);
  }


  getMarkRange($pos = null, type = null) {

    if (!$pos || !type) {
      return false
    }

    const start = $pos.parent.childAfter($pos.parentOffset)

    if (!start.node) {
      return false
    }

    const link = start.node.marks.find(mark => mark.type === type)
    if (!link) {
      return false
    }

    let startIndex = $pos.index()
    let startPos = $pos.start() + start.offset
    let endIndex = startIndex + 1
    let endPos = startPos + start.node.nodeSize

    while (startIndex > 0 && link.isInSet($pos.parent.child(startIndex - 1).marks)) {
      startIndex -= 1
      startPos -= $pos.parent.child(startIndex).nodeSize
    }

    while (endIndex < $pos.parent.childCount && link.isInSet($pos.parent.child(endIndex).marks)) {
      endPos += $pos.parent.child(endIndex).nodeSize
      endIndex += 1
    }

    return { from: startPos, to: endPos }

  }

  updateMark(type, attrs) {
    return (state, dispatch) => {
      const { tr, selection, doc } = state
      let { from, to } = selection
      const { $from, empty } = selection

      if (empty) {
        const range = getMarkRange($from, type)

        from = range.from
        to = range.to
      }

      const hasMark = doc.rangeHasMark(from, to, type)

      if (hasMark) {
        tr.removeMark(from, to, type)
      }

      tr.addMark(from, to, type.create(attrs))

      return dispatch(tr)
    }
  }


  removeMark(type) {
    return (state, dispatch) => {
      const { tr, selection } = state
      let { from, to } = selection
      const { $from, empty } = selection

      if (empty) {
        const range = getMarkRange($from, type)

        from = range.from
        to = range.to
      }

      tr.removeMark(from, to, type)

      return dispatch(tr)
    }
  }


  initCitations() {
    let ids = [];
    editor.state.doc.descendants((node, pos) => {
      if (node.type.name === 'citation') {
        let id = node.type.attrs.id;

        if (!id || ids.includes(id)) {
          id = randomString();
          editor.dispatch(editor.state.tr.setNodeMarkup(pos, null, {
            id,
            content: node.attrs.content,
            citation: node.attrs.citation
          }).setMeta('addToHistory', false));
        }
        else {
          return true;
        }

      }
    });
  }


  updateCitations(citationPreviews) {
    editor.state.doc.descendants((node, pos) => {
      if (node.type.name === 'citation') {
        let citationPreview = citationPreviews[node.attrs.id];
        if (citationPreview && node.attrs.content !== citationPreview) {
          editor.dispatch(editor.state.tr.setNodeMarkup(pos, null, {
            id: node.attrs.id,
            content: citationPreview,
            citation: node.attrs.citation
          }).setMeta('addToHistory', false))
        }
      }
      return true;
    });
  }


  updateCitation(id, citation) {
    editor.state.doc.descendants((node, pos) => {
      if (node.type.name === 'citation' && node.attrs.id === id) {
        editor.dispatch(editor.state.tr.setNodeMarkup(pos, null, {
          id: node.attrs.id,
          content: node.attrs.content,
          citation
        }));
      }
      else {
        return true;
      }
    });
  }


  getHTML() {
    let fragment = DOMSerializer.fromSchema(schema).serializeFragment(editor.state.doc.content);
    let tmp = document.createElement('div');
    tmp.appendChild(fragment);

    // <code> is excluded because it appears inside <pre> tag which results to unexpected \n growth
    let nodes = tmp.querySelectorAll('h1, h2, h3, h4, h5, h6, p, li, br, hr, pre, blockquote, table, tr');
    for (let node of nodes) {
      let newLineTextNode = document.createTextNode('\n');
      node.parentNode.insertBefore(newLineTextNode, node.nextSibling);
    }
    return tmp.innerHTML.trim();
  };

  insertCitations(citations, pos) {
    let html = '';
    for (let citation of citations) {
      html += `<span class="citation" data-citation="${encodeURIComponent(JSON.stringify(citation))}"></span>`;
    }

    view.dispatch(view.state.tr.insert(pos, parser(html)));
  }

  insertAnnotationsAndCitations(list, pos) {
    for (let { annotation, citation } of list) {

      let html = '';

      if (annotation.image) {
        html += `<img class="area" data-item-uri="${annotation.uri}" data-annotation="${encodeURIComponent(JSON.stringify(annotation))}" src="${annotation.image}"/>`;
      }

      if (annotation.comment) {
        html += `${annotation.comment}`;
      }

      if (annotation.text) {
        html += html.length ? ' ' : '';
        html += `<span class="highlight" data-item-uri="${annotation.uri}" data-annotation="${encodeURIComponent(JSON.stringify(annotation))}">"${annotation.text}"</span>`;
      }

      html += html.length ? ' ' : '';
      html += `<span class="citation" data-citation="${encodeURIComponent(JSON.stringify(citation))}"></span>`;

      if (pos) {
        view.dispatch(view.state.tr.insert(pos, parser(html)));
      }
      else {
        view.dispatch(view.state.tr.replaceSelectionWith(parser(html)));
      }
    }
  }
}

export default EditorCore;

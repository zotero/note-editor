import * as basic from 'prosemirror-schema-basic'
import * as list from 'prosemirror-schema-list'
import { tableNodes } from 'prosemirror-tables';
import { DOMParser, Schema } from 'prosemirror-model'

import { encodeObject, decodeObject, generateObjectKey } from '../utils'

function st(styles) {
  let list = [];
  for (let styleName in styles) {
    if (styles[styleName]) {
      list.push(`${styleName}: ${styles[styleName]}`);
    }
  }
  return list.join(';');
}

export default {
  doc: {
    content: 'block+'
  },


  text: {
    group: 'inline'
  },


  paragraph: {
    attrs: {
      indent: { default: null },
      align: { default: null },
      dir: { default: null }
    },
    content: 'inline*',
    group: 'block',
    parseDOM: [
      {
        tag: 'p',
        getAttrs: (node) => ({
          indent: node.style.paddingLeft,
          align: node.style.textAlign,
          dir: node.getAttribute('dir')
        })
      }
    ],
    toDOM(node) {
      const attrs = {
        style: st({ 'text-align': node.attrs.align, 'padding-left': node.attrs.indent }),
        dir: node.attrs.dir || undefined
      };
      return ['p', attrs, 0];
    }
  },


  image: {
    inline: true,
    attrs: {
      dataUrl: { default: null },
      alt: { default: null },
      width: { default: null },
      height: { default: null },
      attachmentKey: { default: null },
      annotation: { default: null }
    },
    group: 'inline',
    draggable: true,
    parseDOM: [{
      tag: 'img',
      getAttrs(dom) {
        return {
          dataUrl: dom.getAttribute('src'),
          alt: dom.getAttribute('alt'),
          width: dom.getAttribute('width'),
          height: dom.getAttribute('height'),
          attachmentKey: dom.getAttribute('data-attachment-key') || generateObjectKey(),
          annotation: decodeObject(dom.getAttribute('data-annotation'))
        }
      }
    }],
    toDOM(node) {
      return ['img', {
        alt: node.attrs.alt,
        width: node.attrs.width,
        height: node.attrs.height,
        'data-attachment-key': node.attrs.attachmentKey,
        'data-annotation': encodeObject(node.attrs.annotation)
      }];
    }
  },


  heading: {
    attrs: {
      level: { default: 1 },
      indent: { default: null },
      align: { default: null },
      dir: { default: null }
    },
    content: 'inline*',
    group: 'block',
    defining: true,
    parseDOM: [
      {
        tag: 'h1',
        getAttrs: (node) => ({
          level: 1,
          align: node.style.textAlign,
          indent: node.style.paddingLeft,
          dir: node.getAttribute('dir')
        })
      },
      {
        tag: 'h2',
        getAttrs: (node) => ({
          level: 2,
          align: node.style.textAlign,
          indent: node.style.paddingLeft,
          dir: node.getAttribute('dir')
        })
      },
      {
        tag: 'h3',
        getAttrs: (node) => ({
          level: 3,
          align: node.style.textAlign,
          indent: node.style.paddingLeft,
          dir: node.getAttribute('dir')
        })
      },
      {
        tag: 'h4',
        getAttrs: (node) => ({
          level: 4,
          align: node.style.textAlign,
          indent: node.style.paddingLeft,
          dir: node.getAttribute('dir')
        })
      },
      {
        tag: 'h5',
        getAttrs: (node) => ({
          level: 5,
          align: node.style.textAlign,
          indent: node.style.paddingLeft,
          dir: node.getAttribute('dir')
        })
      },
      {
        tag: 'h6',
        getAttrs: (node) => ({
          level: 6,
          align: node.style.textAlign,
          indent: node.style.paddingLeft,
          dir: node.getAttribute('dir')
        })
      }],
    toDOM: function toDOM(node) {
      const attrs = {
        style: st({ 'text-align': node.attrs.align, 'padding-left': node.attrs.indent }),
        dir: node.attrs.dir || undefined
      };
      return ['h' + node.attrs.level, attrs, 0]
    }
  },


  code_block: {
    content: 'text*',
    marks: '',
    group: 'block',
    code: true,
    defining: true,
    parseDOM: [{ tag: 'pre', preserveWhitespace: 'full' }],
    toDOM: function toDOM() {
      return ['pre', ['code', 0]];
    }
  },


  blockquote: {
    content: 'block+',
    group: 'block',
    defining: true,
    parseDOM: [{ tag: 'blockquote' }],
    toDOM: function toDOM() {
      return ['blockquote', 0];
    }
  },


  hard_break: {
    inline: true,
    group: 'inline',
    selectable: false,
    parseDOM: [{ tag: 'br' }, { tag: 'span.line-break' }],
    toDOM: () => ([
      'span', { class: 'line-break' }, ['br']
    ])
  },


  ordered_list: {
    attrs: { order: { default: 1 } },
    parseDOM: [{
      tag: 'ol', getAttrs: function getAttrs(dom) {
        return { order: dom.hasAttribute('start') ? +dom.getAttribute('start') : 1 }
      }
    }],
    toDOM: function toDOM(node) {
      return node.attrs.order == 1 ? ['ol', 0] : ['ol', { start: node.attrs.order }, 0]
    },
    content: 'list_item+',
    group: 'block'
  },


  bullet_list: {
    parseDOM: [{ tag: 'ul' }],
    toDOM() {
      return ['ul', 0]
    },
    content: 'list_item+',
    group: 'block'
  },


  list_item: {
    parseDOM: [{ tag: 'li' }],
    toDOM() {
      return ['li', 0]
    },
    defining: true,
    content: 'paragraph block*'
  },


  citation: {
    inline: true,
    group: 'inline',
    draggable: true,
    atom: true,
    content: 'text*',
    editable: false,
    readOnly: true,
    attrs: {
      id: { default: null },
      citation: { default: null },
      content: { default: null }
    },
    toDOM(node) {
      const dom = document.createElement('span');
      dom.className = 'citation';
      dom.setAttribute('data-citation', encodeURIComponent(JSON.stringify(node.attrs.citation)));
      return dom;
    },
    parseDOM: [
      {
        tag: 'span.citation',
        getAttrs(dom) {
          let citation = { citationItems: [], properties: {} };
          try {
            citation = JSON.parse(decodeURIComponent(dom.getAttribute('data-citation')));
          }
          catch (e) {

          }
          return {
            citation
          }
        }
      }
    ]
  },


  highlight: {
    inline: true,
    group: 'inline',
    // draggable: true,
    // atom: true,
    content: 'text*',
    // editable: false,
    // readOnly: true,
    attrs: {
      annotation: { default: '' }
    },
    parseDOM: [{
      tag: 'span.highlight',
      getAttrs(dom) {
        return {
          annotation: decodeObject(dom.getAttribute('data-annotation'))
        }
      }
    }],
    toDOM(node) {
      return ['span', {
        class: 'highlight',
        'data-annotation': encodeObject(node.attrs.annotation)
      }, 0]
    }
  },


  ...tableNodes({
    tableGroup: 'block',
    cellContent: 'text*',
    cellAttributes: {
      background: {
        default: null,
        getFromDOM(dom) {
          return dom.style.backgroundColor || null
        },
        setDOMAttr(value, attrs) {
          if (value) attrs.style = (attrs.style || '') + `background-color: ${value};`
        }
      }
    }
  })
}

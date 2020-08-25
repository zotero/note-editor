import { tableNodes } from 'prosemirror-tables';
import { encodeObject, decodeObject, generateObjectKey, randomString } from '../utils'

const INDENT_WIDTH = 40; // TinyMCE padding width for a single indent

function getInteger(value) {
  if (!value) return null;
  return parseInt(value);
}

function st(styles) {
  let list = [];
  for (let styleName in styles) {
    if (styles[styleName]) {
      list.push(`${styleName}: ${styles[styleName]}`);
    }
  }
  return list.length && list.join(';') || undefined;
}

function paddingToIndent(value) {
  let num = parseInt(value);
  if (num + 'px' === value && num > 0 && (num % INDENT_WIDTH === 0)) {
    return num / INDENT_WIDTH;
  }
  return null;
}

function filterTextAlign(value) {
  return ['left', 'right', 'center', 'justify'].includes(value) && value || null;
}

function filterDir(value) {
  return value === 'rtl' && value || null;
}

export default {
  doc: {
    content: 'block+'
  },


  paragraph: {
    group: 'block',
    content: '(text | hard_break | image | citation | highlight)*',
    attrs: {
      indent: { default: null },
      align: { default: null },
      dir: { default: null }
    },
    parseDOM: [
      {
        tag: 'p',
        getAttrs: (node) => ({
          indent: paddingToIndent(node.style.paddingLeft),
          align: filterTextAlign(node.style.textAlign),
          dir: filterDir(node.getAttribute('dir'))
        })
      },
      { tag: 'dd' }
    ],
    toDOM(node) {
      const attrs = {
        style: st({
          'text-align': node.attrs.align,
          'padding-left': node.attrs.indent && node.attrs.indent * INDENT_WIDTH + 'px'
        }),
        dir: node.attrs.dir
      };
      return ['p', attrs, 0];
    }
  },


  heading: {
    content: '(text | hard_break)*',
    group: 'block',
    defining: true,
    attrs: {
      level: { default: 1 },
      indent: { default: null },
      align: { default: null },
      dir: { default: null },
      id: { default: null }
    },
    parseDOM: [
      {
        tag: 'h1',
        getAttrs: (node) => ({
          level: 1,
          align: filterTextAlign(node.style.textAlign),
          indent: paddingToIndent(node.style.paddingLeft),
          dir: filterDir(node.getAttribute('dir')),
          id: node.getAttribute('id')
        })
      },
      {
        tag: 'h2',
        getAttrs: (node) => ({
          level: 2,
          align: filterTextAlign(node.style.textAlign),
          indent: node.style.paddingLeft,
          dir: filterDir(node.getAttribute('dir')),
          id: node.getAttribute('id')
        })
      },
      {
        tag: 'h3',
        getAttrs: (node) => ({
          level: 3,
          align: filterTextAlign(node.style.textAlign),
          indent: paddingToIndent(node.style.paddingLeft),
          dir: filterDir(node.getAttribute('dir')),
          id: node.getAttribute('id')
        })
      },
      {
        tag: 'h4',
        getAttrs: (node) => ({
          level: 4,
          align: filterTextAlign(node.style.textAlign),
          indent: paddingToIndent(node.style.paddingLeft),
          dir: filterDir(node.getAttribute('dir')),
          id: node.getAttribute('id')
        })
      },
      {
        tag: 'h5',
        getAttrs: (node) => ({
          level: 5,
          align: filterTextAlign(node.style.textAlign),
          indent: paddingToIndent(node.style.paddingLeft),
          dir: filterDir(node.getAttribute('dir')),
          id: node.getAttribute('id')
        })
      },
      {
        tag: 'h6',
        getAttrs: (node) => ({
          level: 6,
          align: filterTextAlign(node.style.textAlign),
          indent: paddingToIndent(node.style.paddingLeft),
          dir: filterDir(node.getAttribute('dir')),
          id: node.getAttribute('id')
        })
      }],
    toDOM: function toDOM(node) {
      const attrs = {
        style: st({
          'text-align': node.attrs.align,
          'padding-left': node.attrs.indent && node.attrs.indent * INDENT_WIDTH + 'px'
        }),
        dir: node.attrs.dir,
        id: node.attrs.id
      };
      return ['h' + node.attrs.level, attrs, 0]
    }
  },


  code_block: {
    group: 'block',
    content: 'text*',
    marks: '',
    code: true,
    defining: true,
    parseDOM: [{ tag: 'pre', preserveWhitespace: 'full' }],
    toDOM: function toDOM() {
      return ['pre', 0];
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


  horizontal_rule: {
    group: 'block',
    parseDOM: [{ tag: 'hr' }],
    toDOM() {
      return ['hr']
    }
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
    group: 'block',
    content: 'list_item+',
    parseDOM: [{ tag: 'ul' }],
    toDOM() {
      return ['ul', 0]
    }
  },


  list_item: {
    content: 'block+',
    defining: true,
    parseDOM: [{ tag: 'li' }],
    toDOM() {
      return ['li', 0]
    }
  },


  ...tableNodes({
    tableGroup: 'block',
    cellContent: 'block+',
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
  }),


  // Inline nodes
  text: {
    group: 'inline'
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


  image: {
    group: 'inline',
    inline: true,
    draggable: true,
    marks: 'link',
    attrs: {
      nodeId: { default: null },
      src: { default: null },
      alt: { default: null },
      title: { default: null },
      width: { default: null },
      height: { default: null },
      naturalWidth: { default: null },
      naturalHeight: { default: null },
      attachmentKey: { default: null },
      annotation: { default: null }
    },
    parseDOM: [{
      tag: 'img',
      getAttrs(dom) {
        return {
          nodeId: randomString(),
          src: dom.getAttribute('src'),
          alt: dom.getAttribute('alt'),
          title: dom.getAttribute('title'),
          width: getInteger(dom.getAttribute('width')),
          height: getInteger(dom.getAttribute('height')),
          naturalWidth: getInteger(dom.getAttribute('data-natural-width')),
          naturalHeight: getInteger(dom.getAttribute('data-natural-height')),
          attachmentKey: dom.getAttribute('data-attachment-key'),
          annotation: decodeObject(dom.getAttribute('data-annotation'))
        }
      }
    }],
    toDOM(node) {
      return ['img', {
        src: node.attrs.attachmentKey ? null : node.attrs.src,
        alt: node.attrs.alt,
        title: node.attrs.title,
        width: node.attrs.width,
        height: node.attrs.height,
        'data-natural-width': node.attrs.naturalWidth,
        'data-natural-height': node.attrs.naturalHeight,
        'data-attachment-key': node.attrs.attachmentKey,
        'data-annotation': node.attrs.annotation && encodeObject(node.attrs.annotation)
      }];
    }
  },


  citation: {
    inline: true,
    group: 'inline',
    draggable: true,
    atom: true,
    selectable: true,
    attrs: {
      nodeId: { default: null },
      citation: { default: null }
    },
    parseDOM: [{
      tag: 'span.citation',
      getAttrs(dom) {
        return {
          nodeId: randomString(),
          citation: decodeObject(dom.getAttribute('data-citation'))
            || { citationItems: [], properties: {} }
        }
      }
    }
    ],
    toDOM(node) {
      return ['span', {
        class: 'citation',
        'data-citation': encodeObject(node.attrs.citation)
      }, '{citation}']
    }
  },


  highlight: {
    inline: true,
    group: 'inline',
    content: 'text*',
    marks: 'em strong subsup',
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
  }
}

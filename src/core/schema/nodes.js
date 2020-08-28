import { tableNodes } from 'prosemirror-tables';
import { encodeObject, decodeObject, generateObjectKey, randomString } from '../utils'

export const MAX_INDENT = 10;

function getInteger(value) {
  if (value) {
    value = parseInt(value);
    if (!isNaN(value)) {
      return value;
    }
  }
  return null;
}

function style(styles) {
  let list = [];
  for (let styleName in styles) {
    if (styles[styleName]) {
      list.push(`${styleName}: ${styles[styleName]}`);
    }
  }
  return list.length && list.join(';') || undefined;
}

function getIndent(node) {
  let indent = node.getAttribute('data-indent');
  if (indent) {
    indent = parseInt(indent);
    if (Number.isInteger(indent) && indent <= MAX_INDENT) {
      return indent;
    }
  }
  else {
    const INDENT_WIDTH = 40; // TinyMCE padding width for a single indent
    let value = node.style.paddingLeft || node.style.paddingRight;
    let num = parseInt(value);
    if (num + 'px' === value && num > 0 && (num % INDENT_WIDTH === 0)) {
      return num / INDENT_WIDTH;
    }
  }
  return null;
}

function getAlign(value) {
  return ['left', 'right', 'center', 'justify'].includes(value) && value || null;
}

function getDir(value) {
  if (value) {
    value = value.toLowerCase();
    if (['ltr', 'rtl'].includes(value)) {
      return value;
    }
  }
  return null;
}

export default {
  doc: {
    content: 'block+'
  },


  // Block nodes
  paragraph: {
    group: 'block',
    content: '(text | hardBreak | image | citation | highlight)*',
    attrs: {
      indent: { default: null },
      align: { default: null },
      dir: { default: null }
    },
    parseDOM: [
      {
        tag: 'p',
        getAttrs: (dom) => ({
          indent: getIndent(dom),
          align: getAlign(dom.style.textAlign),
          dir: getDir(dom.getAttribute('dir'))
        })
      },
      { tag: 'dd' }
    ],
    toDOM: (node) => ['p', {
      style: style({ 'text-align': node.attrs.align }),
      dir: node.attrs.dir,
      'data-indent': node.attrs.indent
    }, 0]

  },


  heading: {
    content: '(text | hardBreak)*',
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
      ...[1, 2, 3, 4, 5, 6].map(level => ({
        tag: 'h' + level,
        getAttrs: (dom) => ({
          level,
          id: dom.getAttribute('id'),
          dir: getDir(dom.getAttribute('dir')),
          indent: getIndent(dom),
          align: getAlign(dom.style.textAlign)
        })
      }))
    ],
    toDOM: (node) => ['h' + node.attrs.level, {
      id: node.attrs.id,
      dir: node.attrs.dir,
      'data-indent': node.attrs.indent,
      style: style({ 'text-align': node.attrs.align })
    }, 0]
  },


  // Additional constraints are applied through transformations
  // codeBlock can only have plain text
  codeBlock: {
    group: 'block',
    content: 'text*',
    marks: '',
    code: true,
    defining: true,
    attrs: { dir: { default: null } },
    parseDOM: [{
      tag: 'pre',
      preserveWhitespace: 'full',
      getAttrs: (dom) => ({
        dir: getDir(dom.getAttribute('dir'))
      })
    }],
    toDOM: (node) => ['pre', { dir: node.attrs.dir }, 0]
  },


  blockquote: {
    content: 'block+',
    group: 'block',
    defining: true,
    parseDOM: [{ tag: 'blockquote' }],
    toDOM: () => ['blockquote', 0]
  },


  horizontalRule: {
    group: 'block',
    parseDOM: [{ tag: 'hr' }],
    toDOM: () => ['hr']
  },


  orderedList: {
    attrs: { order: { default: 1 } },
    parseDOM: [{
      tag: 'ol',
      getAttrs: (dom) => ({
        order: dom.hasAttribute('start') ? +dom.getAttribute('start') : 1
      })
    }],
    toDOM(node) {
      return node.attrs.order == 1 ? ['ol', 0] : ['ol', { start: node.attrs.order }, 0]
    },
    content: 'listItem+',
    group: 'block'
  },


  bulletList: {
    group: 'block',
    content: 'listItem+',
    parseDOM: [{ tag: 'ul' }],
    toDOM: () => ['ul', 0]
  },


  listItem: {
    content: 'block+',
    defining: true,
    parseDOM: [{ tag: 'li' }],
    toDOM: () => ['li', 0]
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


  hardBreak: {
    inline: true,
    group: 'inline',
    selectable: false,
    parseDOM: [{ tag: 'br' }],
    toDOM: () => ['br']
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
      getAttrs: (dom) => ({
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
      })
    }],
    toDOM: (node) => ['img', {
      src: node.attrs.attachmentKey ? null : node.attrs.src,
      alt: node.attrs.alt,
      title: node.attrs.title,
      width: node.attrs.width,
      height: node.attrs.height,
      'data-natural-width': node.attrs.naturalWidth,
      'data-natural-height': node.attrs.naturalHeight,
      'data-attachment-key': node.attrs.attachmentKey,
      'data-annotation': node.attrs.annotation && encodeObject(node.attrs.annotation)
    }]
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
      getAttrs: (dom) => ({
        nodeId: randomString(),
        citation: decodeObject(dom.getAttribute('data-citation'))
          || { citationItems: [], properties: {} }
      })
    }
    ],
    toDOM: (node) => ['span', {
      class: 'citation',
      'data-citation': encodeObject(node.attrs.citation)
    }, '{citation}']
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
      getAttrs: (dom) => ({
        annotation: decodeObject(dom.getAttribute('data-annotation'))
      })
    }],
    toDOM: (node) => ['span', {
      class: 'highlight',
      'data-annotation': encodeObject(node.attrs.annotation)
    }, 0]
  }
}

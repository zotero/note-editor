import * as basic from 'prosemirror-schema-basic'
import * as list from 'prosemirror-schema-list'
import { tableNodes } from 'prosemirror-tables';
import { Schema } from 'prosemirror-model'

import { randomString } from './utils'

const {
  doc,
  heading,
  // paragraph,
  code_block,
  blockquote,
  text,
  hard_break,
  horizontal_rule
} = basic.nodes;

const {
  em,
  strong,
  link
} = basic.marks;

const highlight = {
  inline: true,
  group: 'inline',
  // draggable: true,
  // atom: true,
  content: 'text*',
  // editable: false,
  // readOnly: true,
  attrs: {
    itemUri: { default: '' },
    annotation: { default: '' }
  },
  toDOM(node) {
    return ['span', {
      class: 'highlight',
      'data-item-uri': node.attrs.itemUri,
      'data-annotation': node.attrs.annotation
    }, 0]
  },
  parseDOM: [{
    tag: 'span.highlight',
    getAttrs(dom) {
      return {
        itemUri: dom.getAttribute('data-item-uri'),
        annotation: dom.getAttribute('data-annotation')
      }
    }
  }]
};

let image = {
  inline: true,
  attrs: {
    src: {},
    alt: { default: null },
    title: { default: null },
    itemUri: { default: '' },
    annotation: { default: '' }
  },
  group: 'inline',
  draggable: true,
  parseDOM: [{
    tag: 'img[src]', getAttrs: function getAttrs(dom) {
      return {
        src: dom.getAttribute('src'),
        title: dom.getAttribute('title'),
        alt: dom.getAttribute('alt'),
        itemUri: dom.getAttribute('data-item-uri'),
        annotation: dom.getAttribute('data-annotation')
      }
    }
  }],
  toDOM: function toDOM(node) {
    return ['img', {
      src: node.attrs.src,
      alt: node.attrs.alt,
      title: node.attrs.title,
      'data-item-uri': node.attrs.itemUri,
      'data-annotation': node.attrs.annotation
    }];
  }
}

const imageNodeSpec = {
  atom: true,
  attrs: { src: { default: '' } },
  inline: false,
  group: 'block',
  draggable: true,

  toDOM: node => ['img', { src: node.attrs.src }],
  parseDOM: [{
    tag: 'img',
    getAttrs: dom => {
      return { src: dom.src };
    }
  }]
};

const citation = {
  inline: true,
  group: 'inline',
  draggable: true,
  atom: true,
  content: 'text*',
  editable: false,
  readOnly: true,
  attrs: {
    id: { default: '' },
    citation: { default: null },
    content: { default: '{citation}' }
  },

  toDOM(node) {
    const dom = document.createElement('span');
    dom.className = 'citation';
    // dom.setAttribute('data-id', node.attrs.id);
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

        let id = randomString();

        return {
          id,
          citation
        }
      }
    }
  ]
};

const table = tableNodes({
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
});

function st(styles) {
  let list = [];
  for (let styleName in styles) {
    if (styles[styleName]) {
      list.push(`${styleName}: ${styles[styleName]}`);
    }
  }
  return list.join(';');
}

const nodes = {
  doc,
  text,
  image,
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
  code_block,
  blockquote,

  // horizontal_rule,

  hard_break: {
    ...hard_break,
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
    toDOM: function toDOM() {
      return ['ul', 0]
    },
    content: 'list_item+',
    group: 'block'
  },
  list_item: {
    parseDOM: [{ tag: 'li' }],
    toDOM: function toDOM() {
      return ['li', 0]
    },
    defining: true,
    content: 'paragraph block*'
  },
  citation,
  highlight,
  ...table
}


const marks = {
  link,
  // italic: em,
  // bold: strong,

  em,
  strong,
  strikethrough: {
    parseDOM: [{ tag: 's' }],
    toDOM: function toDOM() {
      return ['s', 0]
    }
  },
  underline: {
    parseDOM: [{ tag: 'u' }],
    toDOM: function toDOM() {
      return ['u', 0]
    }
  },
  subscript: {
    parseDOM: [{ tag: 'sub' }],
    toDOM: function toDOM() {
      return ['sub', 0]
    }
  },
  superscript: {
    parseDOM: [{ tag: 'sup' }],
    toDOM: function toDOM() {
      return ['sup', 0]
    }
  },

  rtl: {
    excludes: 'subscript',
    parseDOM: [
      { tag: 'sup' },
      {
        tag: 'span',
        getAttrs: (node) => (node.style.verticalAlign === 'super')
      }
    ],
    toDOM: () => (['sup'])
  },

  textColor: {
    attrs: {
      textColor: {
        default: ''
      }
    },
    parseDOM: [
      {
        style: 'color',
        getAttrs(value) {
          return { textColor: value };
        }
      }
    ],
    toDOM: mark => {
      return ['span', { style: `color: ${mark.attrs.textColor}` }, 0];
    }
  },
  backgroundColor: {
    attrs: {
      backgroundColor: {
        default: ''
      }
    },
    parseDOM: [
      {
        style: 'background-color',
        getAttrs(value) {
          return { backgroundColor: value };
        }
      }
    ],
    toDOM: mark => {
      return ['span', { style: `background-color: ${mark.attrs.backgroundColor}` }, 0];
    }
  }
};

const schema = new Schema({ nodes, marks });

export {
  nodes,
  marks,
  schema
}

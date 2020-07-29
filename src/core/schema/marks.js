export default {
  link: {
    attrs: {
      href: {},
      title: { default: null }
    },
    inclusive: false,
    parseDOM: [{
      tag: 'a[href]', getAttrs: function getAttrs(dom) {
        return { href: dom.getAttribute('href'), title: dom.getAttribute('title') }
      }
    }],
    toDOM: function toDOM(node) {
      var ref = node.attrs;
      var href = ref.href;
      var title = ref.title;
      return ['a', { href: href, title: title }, 0]
    }
  },
  // italic: em,
  // bold: strong,

  em: {
    parseDOM: [{ tag: 'i' }, { tag: 'em' }, { style: 'font-style=italic' }],
    toDOM: function toDOM() {
      return ['em', 0];
    }
  },


  strong: {
    parseDOM: [{ tag: 'strong' },
      // This works around a Google Docs misbehavior where
      // pasted content will be inexplicably wrapped in `<b>`
      // tags with a font-weight normal.
      {
        tag: 'b', getAttrs: function (node) {
          return node.style.fontWeight != 'normal' && null;
        }
      },
      {
        style: 'font-weight', getAttrs: function (value) {
          return /^(bold(er)?|[5-9]\d{2,})$/.test(value) && null;
        }
      }],
    toDOM: function toDOM() {
      return ['strong', 0];
    }
  },


  code: {
    excludes: `link textColor`,
    inclusive: true,
    parseDOM: [
      { tag: 'code', preserveWhitespace: true },
      { tag: 'tt', preserveWhitespace: true },
      {
        style: 'font-family',
        preserveWhitespace: true,
        getAttrs: (value) => (value.toLowerCase().indexOf('monospace') > -1) && null
      },
      {
        style: 'white-space',
        preserveWhitespace: true,
        getAttrs: value => value === 'pre' && null
      }
    ],
    toDOM() {
      return ['span', {
        style: 'font-family: monospace; white-space: pre-wrap;',
        class: 'code'
      }];
    }
  },


  strikethrough: {
    parseDOM: [
      { tag: 's' },
      { tag: 'strike' },
      { tag: 'del' },
      { style: 'text-decoration', getAttrs: value => value === 'line-through' && null }
    ],
    toDOM: function toDOM() {
      return ['s', 0]
    }
  },


  underline: {
    parseDOM: [
      { tag: 'u' },
      { style: 'text-decoration', getAttrs: value => value === 'underline' && null }
    ],
    toDOM: function toDOM() {
      return ['u', 0]
    }
  },


  subsup: {
    inclusive: true,
    attrs: { type: { default: 'sub' } },
    parseDOM: [
      { tag: 'sub', attrs: { type: 'sub' } },
      { tag: 'sup', attrs: { type: 'sup' } }
    ],
    toDOM(mark) {
      return [mark.attrs.type];
    }
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

export default {
  link: {
    // excludes: 'textColor backgroundColor',
    inclusive: false,
    attrs: {
      href: {},
      title: { default: null }
    },
    parseDOM: [{
      tag: 'a[href]', getAttrs: function getAttrs(dom) {
        return { href: dom.getAttribute('href'), title: dom.getAttribute('title') }
      }
    }],
    toDOM: function toDOM(node) {
      return ['a', {
        ...node.attrs
      }, 0]
    }
  },


  em: {
    inclusive: true,
    parseDOM: [
      { tag: 'i' },
      { tag: 'em' },
      { style: 'font-style=italic' },
      { tag: 'cite' },
      { tag: 'dfn' },
      { tag: 'q' }
    ],
    toDOM: function toDOM() {
      return ['em', 0];
    }
  },


  strong: {
    inclusive: true,
    parseDOM: [{ tag: 'strong' },
      // From ProseMirror source:
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
      },
      { tag: 'dt' }
    ],
    toDOM: function toDOM() {
      return ['strong', 0];
    }
  },


  code: {
    excludes: `_`,
    inclusive: true,
    parseDOM: [
      { tag: 'code', preserveWhitespace: true },
      { tag: 'tt', preserveWhitespace: true },
      { tag: 'kbd', preserveWhitespace: true },
      { tag: 'samp', preserveWhitespace: true },
      { tag: 'var', preserveWhitespace: true },
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
    toDOM: () => ['code', 0]
  },


  strikethrough: {
    inclusive: true,
    parseDOM: [
      { tag: 's' },
      { tag: 'strike' },
      { tag: 'del' },
      { style: 'text-decoration=line-through' },
      { style: 'text-decoration-line=line-through' }
    ],
    toDOM() {
      // can't use `return ['s', 0]` because the old editor doesn't support `<s>` tag
      return ['span', { style: 'text-decoration: line-through' }, 0];
    }
  },


  underline: {
    inclusive: true,
    parseDOM: [
      { tag: 'u' },
      { style: 'text-decoration=underline' },
      { style: 'text-decoration-line=underline' }
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
      { style: 'vertical-align=sub', attrs: { type: 'sub' } },
      { tag: 'sup', attrs: { type: 'sup' } },
      { style: 'vertical-align=super', attrs: { type: 'sup' } }
    ],
    toDOM(mark) {
      return [mark.attrs.type];
    }
  },


  textColor: {
    inclusive: true,
    attrs: {
      color: {
        default: ''
      }
    },
    parseDOM: [
      {
        style: 'color',
        getAttrs(value) {
          return { color: value };
        }
      }
    ],
    toDOM: mark => {
      return ['span', { style: `color: ${mark.attrs.color}` }, 0];
    }
  },


  backgroundColor: {
    inclusive: true,
    attrs: {
      color: {
        default: ''
      }
    },
    parseDOM: [
      {
        style: 'background-color',
        getAttrs(value) {
          return { color: value };
        }
      }
    ],
    toDOM: mark => {
      return ['span', { style: `background-color: ${mark.attrs.color}` }, 0];
    }
  }
};

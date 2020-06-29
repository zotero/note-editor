import { EditorView } from 'prosemirror-view'
import { TextSelection } from 'prosemirror-state'
import { getNodeEndpoints } from './util'
import { Plugin, PluginKey } from 'prosemirror-state'
import { Decoration, DecorationSet } from 'prosemirror-view'

export default new class Search {

  constructor(options = {}) {

    this.options = {
      autoSelectNext: true,
      findClass: 'find',
      searching: true,
      caseSensitive: false,
      wholeWords: false,
      disableRegex: true,
      alwaysSearch: true
    };

    this.editor = this;

    this.results = [];
    this.searchTerm = ''
    this._updating = false
  }

  get name() {
    return 'search'
  }

  get defaultOptions() {
    return {
      autoSelectNext: true,
      findClass: 'find',
      activeFindClass: 'activeFind',
      searching: false,
      caseSensitive: false,
      disableRegex: true,
      alwaysSearch: false,
      searchTerm: ''
    }
  }

  commands() {
    return {
      find: attrs => this.find(attrs),
      replace: attrs => this.replace(attrs),
      replaceAll: attrs => this.replaceAll(attrs),
      clearSearch: () => this.clear(),
      setOptions: attrs => this.setOptions(attrs),
      next: attrs => this.next(attrs),
      prev: attrs => this.prev(attrs)
    }
  }

  next() {
    return (state, dispatch) => {
      let pos = state.selection.$to;
      let result = this.results.find(result => result.from >= pos.pos);
      if (!result) {
        if (this.results.length) {
          result = this.results[0];
        }
        else {
          return;
        }
      }
      dispatch(state.tr.setSelection(TextSelection.between(state.doc.resolve(result.from), state.doc.resolve(result.to))));
    }
  }

  get findRegExp() {
    let searchTerm = this.searchTerm;

    if (this.options.wholeWords) {
      searchTerm = `\\b(${searchTerm})\\b`;
    }

    return RegExp(searchTerm, !this.options.caseSensitive ? 'gui' : 'gu')
  }

  get decorations() {
    return this.results.map((deco, index) => (
      Decoration.inline(deco.from, deco.to, { class: this.options.findClass })
    ))
  }

  _search(doc) {
    this.results = []
    const mergedTextNodes = []
    let index = 0

    if (!this.searchTerm) {
      return
    }

    doc.descendants((node, pos) => {
      if (node.isText) {
        if (mergedTextNodes[index]) {
          mergedTextNodes[index] = {
            text: mergedTextNodes[index].text + node.text,
            pos: mergedTextNodes[index].pos
          }
        }
        else {
          mergedTextNodes[index] = {
            text: node.text,
            pos
          }
        }
      }
      else {
        index += 1
      }
    })

    mergedTextNodes.forEach(({ text, pos }) => {
      const search = this.findRegExp
      let m
      // eslint-disable-next-line no-cond-assign
      while ((m = search.exec(text))) {
        if (m[0] === '') {
          break
        }

        this.results.push({
          from: pos + m.index,
          to: pos + m.index + m[0].length
        })
      }
    })
  }

  setOptions(options) {
    return (state, dispatch) => {
      for (let name in options) {
        this.options[name] = options[name];
      }

      this.updateView(state, dispatch)
    }
  }

  replace(replace) {
    return (state, dispatch, view) => {
      // console.log('replace', state.selection)
      let from = state.selection.$from;
      let to = state.selection.$to;
      let result = this.results.find(result => result.from === from.pos && result.to === to.pos);

      if (!result) {
        let result = this.results.find(result => result.from >= to.pos);
        if (result) {
          dispatch(state.tr.setSelection(TextSelection.between(state.doc.resolve(result.from), state.doc.resolve(result.to))));
        }
        return;
      }

      let result2 = this.results.find(result => result.from >= to.pos + 1);


      let tr = state.tr.insertText(replace, result.from, result.to);

      if (result2) {
        let diff = replace.length - (result.to - result.from);
        tr.setSelection(TextSelection.between(tr.doc.resolve(result2.from + diff), tr.doc.resolve(result2.to + diff)))
      }

      dispatch(tr);

    }
  }

  rebaseNextResult(replace, index, lastOffset = 0) {
    const nextIndex = index + 1

    if (!this.results[nextIndex]) {
      return null
    }

    const { from: currentFrom, to: currentTo } = this.results[index]
    const offset = (currentTo - currentFrom - replace.length) + lastOffset
    const { from, to } = this.results[nextIndex]

    this.results[nextIndex] = {
      to: to - offset,
      from: from - offset
    }

    return offset
  }

  replaceAll(replace) {
    return ({ tr }, dispatch) => {
      let offset

      if (!this.results.length) {
        return
      }

      this.results.forEach(({ from, to }, index) => {
        tr.insertText(replace, from, to)
        offset = this.rebaseNextResult(replace, index, offset)
      })

      dispatch(tr)

      // this.editor.commands.find(this.searchTerm)
    }
  }

  find(searchTerm) {
    return (state, dispatch) => {
      this.searchTerm = this.options.disableRegex
        ? searchTerm.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')
        : searchTerm

      this.options.searchTerm = searchTerm;
      this.updateView(state, dispatch)
    }
  }

  clear() {
    return (state, dispatch) => {
      this.searchTerm = null

      this.updateView(state, dispatch)
    }
  }

  updateView({ tr }, dispatch) {
    this._updating = true
    dispatch(tr)
    this._updating = false
  }

  createDeco(doc) {
    this._search(doc)
    return this.decorations
      ? DecorationSet.create(doc, this.decorations)
      : []
  }

  get plugins() {
    return [
      new Plugin({
        key: new PluginKey('find-replace'),
        state: {
          init() {
            return DecorationSet.empty
          },
          apply: (tr, old) => {
            if (this._updating
              || this.options.searching
              || (tr.docChanged && this.options.alwaysSearch)
            ) {
              return this.createDeco(tr.doc)
            }

            if (tr.docChanged) {
              return old.map(tr.mapping, tr.doc)
            }

            return old
          }
        },
        props: {
          decorations(state) {
            return this.getState(state)
          }
        },
        options: this.options
      })
    ]
  }
}

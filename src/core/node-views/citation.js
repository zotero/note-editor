class CitationView {
  constructor(node, view, getPos, options) {
    this.provider = options.provider;
    this.dom = document.createElement('span')
    this.dom.className = 'citation';
    this.dom.innerHTML = '{citation}';
    this.dom.onclick = event => {
      event.preventDefault();
      options.onClick(node);
    }

    this.listener = (data) => {
      this.dom.innerHTML = data.formattedCitation ?
        `(${data.formattedCitation})` : '{citation}';
    }

    this.provider.subscribe({
      type: 'citation',
      nodeId: node.attrs.nodeId,
      data: {
        citation: node.attrs.citation
      },
      listener: this.listener
    });
  }

  selectNode() {
    this.dom.classList.add('selected');
  }

  deselectNode() {
    this.dom.classList.remove('selected');
  }

  destroy() {
    this.provider.unsubscribe(this.listener);
  }
}

export default function (options) {
  return function (node, view, getPos) {
    return new CitationView(node, view, getPos, options);
  }
}

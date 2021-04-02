class CitationView {
	constructor(node, view, getPos, options) {
		this.provider = options.provider;
		this.dom = document.createElement('span');
		this.dom.className = 'citation';
		this.dom.innerHTML = '{citation}';

		this.listener = (data) => {
			this.dom.innerHTML = data.formattedCitation
				? `(${data.formattedCitation})`
				: '{citation}';
		};

		this.provider.subscribe({
			type: 'citation',
			nodeID: node.attrs.nodeID,
			data: {
				citation: JSON.parse(JSON.stringify(node.attrs.citation))
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
	};
}

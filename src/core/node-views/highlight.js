import { formatCitation } from '../utils';

class HighlightView {
	constructor(node, view, getPos, options) {
		this.node = node;
		this.options = options;
		
		this.dom = document.createElement('span');
		this.dom.className = 'highlight';
		this.contentDOM = this.dom;
		
		this.updateCitation();
	}
	
	updateCitation() {
		let formattedCitation = '';
		if (this.node.attrs.annotation.citationItem) {
			try {
				let citationItem = JSON.parse(JSON.stringify(this.node.attrs.annotation.citationItem));
				let citation = {
					citationItems: [citationItem],
					properties: {}
				};

				this.options.metadata.fillCitationItemsWithData(citation.citationItems);
				let missingItemData = citation.citationItems.find(x => !x.itemData);
				if (!missingItemData) {
					formattedCitation = formatCitation(citation);
				}
			}
			catch (e) {
			}
		}

		if (formattedCitation) {
			this.dom.title = formattedCitation;
		} else {
			this.dom.removeAttribute('title');
		}
	}
	
	update(node) {
		if (node.type !== this.node.type) {
			return false;
		}
		this.node = node;
		this.updateCitation();
		return true;
	}
}

export default function (options) {
	return function (node, view, getPos) {
		return new HighlightView(node, view, getPos, options);
	};
}

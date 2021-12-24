import { formatCitation } from '../utils';

class HighlightView {
	constructor(node, view, getPos, options) {
		this.dom = document.createElement('span');
		this.dom.className = 'highlight';
		this.contentDOM = this.dom;
		let formattedCitation = '';
		if (node.attrs.annotation.citationItem) {
			try {
				let citationItem = JSON.parse(JSON.stringify(node.attrs.annotation.citationItem));
				let citation = {
					citationItems: [citationItem],
					properties: {}
				};

				options.metadata.fillCitationItemsWithData(citation.citationItems);
				let missingItemData = citation.citationItems.find(x => !x.itemData);
				if (!missingItemData) {
					formattedCitation = formatCitation(citation);
				}
			}
			catch (e) {
				console.log(e);
			}
		}

		if (formattedCitation) {
			this.dom.title = formattedCitation;
		}
	}
}

export default function (options) {
	return function (node, view, getPos) {
		return new HighlightView(node, view, getPos, options);
	};
}

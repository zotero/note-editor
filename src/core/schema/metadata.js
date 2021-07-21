import { schema } from './index';
import { basicDeepEqual } from '../utils';

// Note: Metadata change doesn't trigger note updating. Instead, new
// metadata is only applied when note is actually edited

export default class Metadata {
	constructor(options) {
		this.options = options;
		// Keeps schema version number from metadata container,
		// but when serializing uses the current one from `schema.version`
		this._schemaVersion = 0;
		this._citationItems = [];
	}

	get schemaVersion() {
		return this._schemaVersion;
	}

	get citationItems() {
		return this._citationItems;
	}

	fromJSON(json) {
		this._schemaVersion = json.schemaVersion;
		this._citationItems = json.citationItems;
	}

	toJSON() {
		return {
			schemaVersion: this._schemaVersion,
			citationItems: this._citationItems
		}
	}

	serializeAttributes() {
		let attributes = [];

		attributes['data-schema-version'] = schema.version.toString();

		if (this._citationItems.length) {
			attributes['data-citation-items'] = encodeURIComponent(JSON.stringify(this._citationItems));
		}

		return attributes
	}

	parseAttributes(attributes) {
		// schemaVersion
		try {
			let schemaVersion = attributes['data-schema-version'];
			if (schemaVersion) {
				schemaVersion = parseInt(schemaVersion);
				if (Number.isInteger(schemaVersion)) {
					this._schemaVersion = schemaVersion;
				}
			}
		}
		catch (e) {
			console.log(e);
		}

		// citationItems
		try {
			let citationItems = attributes['data-citation-items'];
			if (citationItems) {
				citationItems = JSON.parse(decodeURIComponent(citationItems));
				if (Array.isArray(citationItems)) {
					this._citationItems = citationItems;
				}
			}
		}
		catch (e) {
			console.log(e);
		}
	}

	fillCitationItemsWithData(citationItems) {
		for (let citationItem of citationItems) {
			let item = this._citationItems
			.find(item => item.uris.some(uri => citationItem.uris.includes(uri)));

			if (item) {
				citationItem.itemData = item.itemData;
			}
		}
	}

	deleteUnusedCitationItems(state) {
		state.tr.doc.descendants((node, pos) => {
			try {
				let citationItems;
				if (node.type.attrs.citation) {
					citationItems = node.attrs.citation.citationItems
				}
				else if (node.type.attrs.annotation
					&& node.attrs.annotation.citationItem) {
					citationItems = [node.attrs.annotation.citationItem];
				}

				if (citationItems) {
					for (let citationItem of citationItems) {
						let { uris } = citationItem;
						let item = this._citationItems
						.find(item => item.uris.some(uri => uris.includes(uri)));

						if (item) {
							item.used = true;
						}
					}
				}
			}
			catch (e) {
				console.log(e);
			}
		});

		let updated = false;
		for (let i = this._citationItems.length - 1; i >= 0; i--) {
			let item = this._citationItems[i];
			if (!item.used) {
				this._citationItems.splice(i, 1);
				updated = true;
			}
			delete item.used;
		}

		return updated;
	}

	getMissingCitationItems(state) {
		let missingItemsList = []
		state.tr.doc.descendants((node, pos) => {
			try {
				let citationItems;
				if (node.type.attrs.citation) {
					citationItems = node.attrs.citation.citationItems
				}
				else if (node.type.attrs.annotation
					&& node.attrs.annotation.citationItem) {
					citationItems = [node.attrs.annotation.citationItem];
				}

				if (citationItems) {
					for (let citationItem of citationItems) {
						let { uris } = citationItem;

						let existsInMetadata = this._citationItems
						.find(item => item.uris.some(uri => uris.includes(uri)));

						let existsInMissing = missingItemsList
						.find(item => item.uris.some(uri => uris.includes(uri)));

						if (!existsInMetadata && !existsInMissing) {
							missingItemsList.push({ uris });
						}
					}
				}
			}
			catch (e) {
				console.log(e);
			}
		});
		return missingItemsList;
	}

	// Only add if doesn't exist
	addPulledCitationItems(citationItems) {
		let updated = false;
		for (let citationItem of citationItems) {
			let existingItem = this._citationItems
			.find(item => item.uris.some(uri => citationItem.uris.includes(uri)));
			if (!existingItem) {
				this._citationItems.push(citationItem);
				updated = true;
			}
		}
		return updated;
	}

	updateCitationItems(citationItems) {
		let updatedCitationItems = [];
		for (let citationItem of citationItems) {
			citationItem = { uris: citationItem.uris, itemData: citationItem.itemData };
			let existingItemIndex = this._citationItems
			.findIndex(item => item.uris.some(uri => citationItem.uris.includes(uri)));

			if (existingItemIndex >= 0) {
				let existingItem = this._citationItems[existingItemIndex];
				if (!basicDeepEqual(citationItem, existingItem)) {
					this._citationItems.splice(existingItemIndex, 1, citationItem);
					updatedCitationItems.push(citationItem);
				}
			}
			else {
				this._citationItems.push(citationItem);
				updatedCitationItems.push(citationItem);
			}
		}

		return updatedCitationItems;
	}
}

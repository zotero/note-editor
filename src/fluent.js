import { FluentBundle, FluentResource } from '@fluent/bundle';

import zotero from '../locales/en-US/zotero.ftl';
import reader from '../locales/en-US/note-editor.ftl';

export let bundle = new FluentBundle('en-US', {
	functions: {
		PLATFORM: () => 'web',
	},
});

bundle.addResource(new FluentResource(zotero));
bundle.addResource(new FluentResource(reader));

if (__BUILD__ !== 'zotero') {
	bundle.addResource(new FluentResource('-app-name = Zotero'));
}

export function addFTL(ftl) {
	bundle.addResource(new FluentResource(ftl));
}

export function getLocalizedString(key, args = {}) {
	const message = bundle.getMessage(key);
	if (message && message.value) {
		return bundle.formatPattern(message.value, args);
	} else {
		console.warn(`Localization key '${key}' not found`);
		return key;
	}
}

import { Plugin, PluginKey } from 'prosemirror-state';

export function readOnly(options) {
	return new Plugin({
		filterTransaction(tr) {
			if (options.enable) {
				if (tr.docChanged) {
					return false;
				}
			}
			return true;
		}
	});
}

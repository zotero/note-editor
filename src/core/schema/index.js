import { Schema } from 'prosemirror-model';
import nodes from './nodes';
import marks from './marks';
import { buildToHTML, buildFromHTML, buildClipboardSerializer } from './utils';

const schema = new Schema({ nodes, marks });
// Update in Zotero 'editorInstance.js' as well!
schema.version = 2;

const toHTML = buildToHTML(schema);
const fromHTML = buildFromHTML(schema);


export {
	nodes,
	marks,
	schema,
	toHTML,
	fromHTML,
	buildClipboardSerializer
};

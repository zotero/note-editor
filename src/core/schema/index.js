import { Schema } from 'prosemirror-model';
import nodes from './nodes';
import marks from './marks';
import { buildToHTML, buildFromHTML, buildClipboardSerializer } from './utils';
import { HIGHLIGHT_COLORS } from './colors';

const schema = new Schema({ nodes, marks });
// Update in Zotero 'editorInstance.js' as well!
schema.version = 7;

const toHTML = buildToHTML(schema);
const fromHTML = buildFromHTML(schema);

// Note: Upgrade schema version if introducing new quotation marks
const QUOTATION_MARKS = ["'",'"', '“', '”', '‘', '’', '„','«','»'];

export {
	nodes,
	marks,
	schema,
	toHTML,
	fromHTML,
	buildClipboardSerializer,
	QUOTATION_MARKS,
	HIGHLIGHT_COLORS
};

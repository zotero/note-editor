import { Schema } from 'prosemirror-model';
import nodes from './nodes';
import marks from './marks';
import { buildToHTML, buildFromHTML, buildClipboardSerializer } from './utils';

const schema = new Schema({ nodes, marks });
schema.version = 1;

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

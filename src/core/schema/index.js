import { Schema } from 'prosemirror-model';
import nodes from './nodes';
import marks from './marks';
import { buildToHtml, buildFromHtml, buildClipboardSerializer } from './utils';

const schemaVersion = 1;

const schema = new Schema({ nodes, marks });
const toHtml = buildToHtml(schema);
const fromHtml = buildFromHtml(schema);


export {
  schemaVersion,
  nodes,
  marks,
  schema,
  toHtml,
  fromHtml,
  buildClipboardSerializer
};

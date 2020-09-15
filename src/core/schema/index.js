import { Schema } from 'prosemirror-model';
import nodes from './nodes';
import marks from './marks';
import { buildToHtml, buildFromHtml, buildClipboardSerializer } from './utils';

const schema = new Schema({ nodes, marks });
schema.version = 1;

const toHtml = buildToHtml(schema);
const fromHtml = buildFromHtml(schema);


export {
  nodes,
  marks,
  schema,
  toHtml,
  fromHtml,
  buildClipboardSerializer
};

import { Schema } from 'prosemirror-model';
import nodes from './nodes';
import marks from './marks';
import { buildToHtml, buildFromHtml, buildClipboardSerializer } from './utils';

const schema = new Schema({ nodes, marks });
const toHtml = buildToHtml(schema);
const fromHtml = buildFromHtml(schema);
const clipboardSerializer = buildClipboardSerializer(schema);

export {
  nodes,
  marks,
  schema,
  toHtml,
  fromHtml,
  clipboardSerializer
};

import { chainCommands } from 'prosemirror-commands';
import { undo as historyUndo, redo as historyRedo } from 'prosemirror-history';
import { undoInputRule } from 'prosemirror-inputrules';

export const undoCommand = chainCommands(undoInputRule, historyUndo);
export const redoCommand = historyRedo;

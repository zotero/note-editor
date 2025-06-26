'use strict';

import React from 'react';
import { useLocalization } from '@fluent/react';
import cx from 'classnames';

import Dropdown from './dropdown';
import { StateButton } from './button';

import IconFormatText from '../../../res/icons/20/format-text.svg';
import IconBold from '../../../res/icons/20/bold.svg';
import IconItalic from '../../../res/icons/20/italic.svg';
import IconUnderline from '../../../res/icons/20/underline.svg';
import IconStrike from '../../../res/icons/20/strikethrough.svg';
import IconSubscript from '../../../res/icons/20/subscript.svg';
import IconSuperscript from '../../../res/icons/20/superscript.svg';
import IconCode from '../../../res/icons/20/monospaced-1.25.svg';

export default function TextDropdown({ menuState }) {
	const { l10n } = useLocalization();

	const blockTypes = [
		['heading1', <h1>{l10n.getString('note-editor-heading-1')}</h1>],
		['heading2', <h2>{l10n.getString('note-editor-heading-2')}</h2>],
		['heading3', <h3>{l10n.getString('note-editor-heading-3')}</h3>],
		['paragraph', <span>{l10n.getString('note-editor-paragraph')}</span>],
		['codeBlock', <code>{l10n.getString('note-editor-monospaced')}</code>],
		['bulletList', <span>• {l10n.getString('note-editor-bullet-list')}</span>],
		['orderedList', <span>1. {l10n.getString('note-editor-ordered-list')}</span>],
		['blockquote', <span>│ {l10n.getString('note-editor-block-quote')}</span>],
		['math_display', <span>𝑓 {l10n.getString('note-editor-math-block')}</span>],
	];

	const handleItemPick = (type) => {
		menuState[type].run();
	}

	return (
		<Dropdown
			className="text-dropdown"
			icon={<IconFormatText/>}
			title={l10n.getString('note-editor-format-text')}
		>
			<div className="inline-options">
				<div className="line">
					<StateButton
						role="menuitem"
						icon={<IconBold/>}
						title={l10n.getString('note-editor-bold')}
						state={menuState.strong}
					/>
					<StateButton
						role="menuitem"
						icon={<IconItalic/>}
						title={l10n.getString('note-editor-italic')}
						state={menuState.em}
					/>
					<StateButton
						role="menuitem"
						icon={<IconUnderline/>}
						title={l10n.getString('note-editor-underline')}
						state={menuState.underline}
					/>
					<StateButton
						role="menuitem"
						icon={<IconStrike/>}
						title={l10n.getString('note-editor-strikethrough')}
						state={menuState.strike}
					/>
				</div>
				<div className="line">
					<StateButton
						role="menuitem"
						icon={<IconSubscript/>}
						title={l10n.getString('note-editor-subscript')}
						state={menuState.subscript}
					/>
					<StateButton
						role="menuitem"
						icon={<IconSuperscript/>}
						title={l10n.getString('note-editor-superscript')}
						state={menuState.superscript}
					/>
					<StateButton
						role="menuitem"
						icon={<IconCode/>}
						title={l10n.getString('note-editor-monospaced')}
						state={menuState.code}
					/>
				</div>
			</div>
			<div className="separator"/>
			<div className="block-options">
				{blockTypes.map(([type, element], index) => (
					<button
						role="menuitem"
						key={index}
						className={cx('option', { active: menuState[type].isActive })}
						onClick={() => handleItemPick(type)}
						onMouseDown={(event) => event.preventDefault()}
					>{element}</button>
				))}
			</div>
		</Dropdown>
	);
}

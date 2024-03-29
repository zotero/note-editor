'use strict';

import React from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
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

const blockTypes = [
	['heading1', <h1><FormattedMessage id="noteEditor.heading1"/></h1>],
	['heading2', <h2><FormattedMessage id="noteEditor.heading2"/></h2>],
	['heading3', <h3><FormattedMessage id="noteEditor.heading3"/></h3>],
	['paragraph', <span><FormattedMessage id="noteEditor.paragraph"/></span>],
	['codeBlock', <code><FormattedMessage id="noteEditor.monospaced"/></code>],
	['bulletList', <span>• <FormattedMessage id="noteEditor.bulletList"/></span>],
	['orderedList', <span>1. <FormattedMessage id="noteEditor.orderedList"/></span>],
	['blockquote', <span>│ <FormattedMessage id="noteEditor.blockquote"/></span>],
	['math_display', <span>𝑓 <FormattedMessage id="noteEditor.mathBlock"/></span>]
];

export default function TextDropdown({ menuState }) {
	const intl = useIntl();

	function handleItemPick(type) {
		menuState[type].run();
	}

	return (
		<Dropdown
			className="text-dropdown"
			icon={<IconFormatText/>}
			title={intl.formatMessage({ id: 'noteEditor.formatText' })}
		>
			<div className="inline-options">
				<div className="line">
					<StateButton
						role="menuitem"
						icon={<IconBold/>}
						title={intl.formatMessage({ id: 'noteEditor.bold' })}
						state={menuState.strong}
					/>
					<StateButton
						role="menuitem"
						icon={<IconItalic/>}
						title={intl.formatMessage({ id: 'noteEditor.italic' })}
						state={menuState.em}
					/>
					<StateButton
						role="menuitem"
						icon={<IconUnderline/>}
						title={intl.formatMessage({ id: 'noteEditor.underline' })}
						state={menuState.underline}
					/>
					<StateButton
						role="menuitem"
						icon={<IconStrike/>}
						title={intl.formatMessage({ id: 'noteEditor.strikethrough' })}
						state={menuState.strike}
					/>
				</div>
				<div className="line">
					<StateButton
						role="menuitem"
						icon={<IconSubscript/>}
						title={intl.formatMessage({ id: 'noteEditor.subscript' })}
						state={menuState.subscript}
					/>
					<StateButton
						role="menuitem"
						icon={<IconSuperscript/>}
						title={intl.formatMessage({ id: 'noteEditor.superscript' })}
						state={menuState.superscript}
					/>
					<StateButton
						role="menuitem"
						icon={<IconCode/>}
						title={intl.formatMessage({ id: 'noteEditor.monospaced' })}
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

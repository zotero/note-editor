'use strict';

import React from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import cx from 'classnames';

import {
	IconBold,
	IconCase,
	IconItalic,
	IconUnderline
} from '../icons';
import Dropdown from './dropdown';
import { StateButton } from './button';

const blockTypes = [
	['heading1', <h1><FormattedMessage id="noteEditor.heading1"/></h1>],
	['heading2', <h2><FormattedMessage id="noteEditor.heading2"/></h2>],
	['heading3', <h3><FormattedMessage id="noteEditor.heading3"/></h3>],
	['paragraph', <span><FormattedMessage id="noteEditor.paragraph"/></span>],
	['code', <code><FormattedMessage id="noteEditor.monospaced"/></code>],
	['bulletList', <code><FormattedMessage id="noteEditor.bulletList"/></code>],
	['orderedList', <span><FormattedMessage id="noteEditor.orderedList"/></span>],
	['blockquote', <span><FormattedMessage id="noteEditor.blockquote"/></span>]
];

export default function TextDropdown({ menuState }) {
	const intl = useIntl();

	function handleItemPick(type) {
		menuState[type].run();
	}

	return (
		<Dropdown
			className="text-dropdown"
			icon={<IconCase/>}
			title={intl.formatMessage({ id: 'noteEditor.formatText' })}
		>
			<div className="inline-options">
				<StateButton
					icon={<IconBold/>}
					title={intl.formatMessage({ id: 'noteEditor.bold' })}
					state={menuState.strong}
				/>
				<StateButton
					icon={<IconItalic/>}
					title={intl.formatMessage({ id: 'noteEditor.italic' })}
					state={menuState.em}
				/>
				<StateButton
					icon={<IconUnderline/>}
					title={intl.formatMessage({ id: 'noteEditor.underline' })}
					state={menuState.underline}
				/>
			</div>
			<div className="block-options">
				{blockTypes.map(([type, element], index) => (
					<div
						key={index}
						className={cx('option', { active: menuState[type].isActive })}
						onClick={() => handleItemPick(type)}
					>{element}</div>
				))}
			</div>
		</Dropdown>
	);
}

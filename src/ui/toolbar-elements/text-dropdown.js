'use strict';

import cx from 'classnames';
import React from 'react';
import {
	IconBold,
	IconCase,
	IconItalic,
	IconUnderline
} from '../icons';
import Dropdown from './dropdown';
import { StateButton } from './button';

const blockTypes = [
	['heading1', <h1>Heading 1</h1>],
	['heading2', <h2>Heading 2</h2>],
	['heading3', <h3>Heading 3</h3>],
	['paragraph', <span>Paragraph</span>],
	['code', <code>Monospaced</code>],
	['bulletList', <span>Bulleted List</span>],
	['orderedList', <span>Numbered List</span>],
	['blockquote', <span>Block Quote</span>]
];

export default function TextDropdown({ menuState }) {

	function handleItemPick(type) {
		menuState[type].run();
	}

	return (
		<Dropdown className="text-dropdown" icon={<IconCase/>} title="Text Format">
			<div className="inline-options">
				<StateButton icon={<IconBold/>} title="Bold" state={menuState.strong}/>
				<StateButton icon={<IconItalic/>} title="Italic" state={menuState.em}/>
				<StateButton icon={<IconUnderline/>} title="Underline" state={menuState.underline}/>
			</div>
			<div className="block-options">
				{blockTypes.map(([type, element], index) => (
					<div key={index} className={cx('option', { active: menuState[type].isActive })}
					     onClick={() => handleItemPick(type)}>{element}</div>
				))}
			</div>
		</Dropdown>
	);
}

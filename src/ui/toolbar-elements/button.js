'use strict';

import React from 'react';
import cx from 'classnames';

export function Button({ icon, title, active, className, triggerOnMouseDown, onClick }) {
	return (
		<button
			className={cx('toolbar-button', { active: !!active }, className)}
			title={title}
			onClick={(event) => {
				event.preventDefault();
				if (triggerOnMouseDown && event.detail) {
					return;
				}
				onClick();
			}}
			onMouseDown={(event) => {
				// preventDefault prevents :active activation on Firefox
				// (see https://bugzilla.mozilla.org/show_bug.cgi?id=771241)
				event.preventDefault();
				if (!triggerOnMouseDown || event.button !== 0) {
					return;
				}
				onClick();
			}}
		>
			{icon}
		</button>
	);
}

export function StateButton({ icon, title, state }) {
	return (
		<Button icon={icon} title={title} active={state.isActive} onClick={() => state.run()}/>
	);
}

'use strict';

import React from 'react';
import cx from 'classnames';

export function Button({ icon, title, active, onClick, onMouseDown }) {
	return (
		<div
			className={cx('toolbar-button', { active: !!active })}
			title={title}
			onClick={(e) => {
				e.preventDefault();
				onClick && onClick();
			}}
			onMouseDown={(e) => {
				e.preventDefault();
				onMouseDown && onMouseDown();
			}}
		>
			{icon}
		</div>
	);
}

export function StateButton({ icon, title, state }) {
	return (
		<Button icon={icon} title={title} active={state.isActive} onClick={() => state.run()}/>
	);
}

'use strict';

import React, { forwardRef } from 'react';
import cx from 'classnames';

export const Button = forwardRef(({ icon, title, active, className, triggerOnMouseDown, onClick, ...rest }, ref) => {
	return (
		<button
			{ ...rest }
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
			ref={ref}
		>
			{icon}
		</button>
	);
});

export function StateButton({ icon, title, state, ...rest }) {
	return (
		<Button
			{ ...rest }
			icon={icon}
			title={title}
			active={state.isActive}
			onClick={() => state.run()}
		/>
	);
}

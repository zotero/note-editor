'use strict';

import React, {} from 'react';
import cx from 'classnames';

export default function Button({ state, icon, title }) {
	return (
		<div
			className={cx('toolbar-button', { active: state.isActive })}
			title={title}
			onMouseDown={(e) => {
				e.preventDefault();
				state.run();
			}}
		>
			{icon}
		</div>
	);
}

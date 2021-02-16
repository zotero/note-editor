'use strict';

import cx from 'classnames';
import React from 'react';

function Noticebar({ message, children }) {
	return (
		<div className="noticebar">
			{children}
		</div>
	);
}

export default Noticebar;

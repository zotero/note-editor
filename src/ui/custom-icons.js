'use strict';

import React from 'react';

export function IconHighlighter({ color }) {
	return (
		<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
			<path
				fillRule="evenodd"
				clipRule="evenodd"
				d="M13.3839 1.5C12.8957 1.01184 12.1043 1.01184 11.6161 1.5L4.5 8.61611C4.01185 9.10427 4.01184 9.89572 4.5 10.3839L5.05806 10.9419L2 14H6L7.05806 12.9419L7.61612 13.5C8.10427 13.9882 8.89573 13.9882 9.38388 13.5L16.5 6.38388C16.9882 5.89573 16.9882 5.10427 16.5 4.61611L13.3839 1.5ZM9.38388 5.5L12.5 2.38388L15.6161 5.5L12.5 8.61611L9.38388 5.5ZM8.5 6.38388L5.38388 9.5L8.5 12.6161L11.6161 9.5L8.5 6.38388ZM2.25 16.25H17.75V17.75H2.25V16.25ZM1 19V15H19V19H1Z"
				fill="currentColor"
			/>
			{color && <path d="M1 15H19V19H1V15Z" fill={color}/>}
		</svg>
	);
}

export function IconTextColor({ color }) {
	return (
		<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
			<path fillRule="evenodd" clipRule="evenodd"
				  d="M16 14L11 2H9L4 14H6.16667L7.41667 11H12.5833L13.8333 14H16ZM10 4.8L8.04167 9.5H11.9583L10 4.8ZM2.25 17.75V16.25H17.75V17.75H2.25ZM1 15H2.25H17.75H19V16.25V17.75V19H17.75H2.25H1V17.75V16.25V15Z"
				  fill="currentColor"/>

			<path d="M1 15H19V19H1V15Z" fill={color}/>
		</svg>
	);
}

export function IconColor({ color }) {
	return (
		<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
			<g id="icon">
				<g id="Vector">
					<path
						d="M1 3C1 1.89543 1.89543 1 3 1H13C14.1046 1 15 1.89543 15 3V13C15 14.1046 14.1046 15 13 15H3C1.89543 15 1 14.1046 1 13V3Z"
						fill={color}
					/>
					<path
						d="M1.5 3C1.5 2.17157 2.17157 1.5 3 1.5H13C13.8284 1.5 14.5 2.17157 14.5 3V13C14.5 13.8284 13.8284 14.5 13 14.5H3C2.17157 14.5 1.5 13.8284 1.5 13V3Z"
						stroke="black"
						strokeOpacity="0.1"
					/>
				</g>
			</g>
		</svg>
	);
}

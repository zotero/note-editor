'use strict';

import React, { useState, useEffect, useLayoutEffect, useRef, Fragment } from 'react';
import { useIntl } from 'react-intl';
import cx from 'classnames';

import Popup from './popup';

import IconCheckmark from '../../../res/icons/16/checkmark.svg';
import IconEdit from '../../../res/icons/16/edit.svg';
import IconUnlink from '../../../res/icons/16/unlink.svg';

function LinkPopup({ parentRef, pluginState }) {
	const intl = useIntl();
	const [editing, setEditing] = useState(false);
	const inputRef = useRef();

	useEffect(() => {
		setEditing(!pluginState.href || pluginState.edit);
	}, [pluginState]);

	useLayoutEffect(() => {
		if (inputRef.current) {
			inputRef.current.value = pluginState.href || 'https://';
		}

		if (editing) {
			setTimeout(() => {
				if (inputRef.current) {
					inputRef.current.focus();
					if (pluginState.href) {
						inputRef.current.select();
					}
				}
			}, 0);
		}
	}, [editing, pluginState]);

	function handleSet() {
		pluginState.setURL(inputRef.current.value);
	}

	function handleUnset() {
		pluginState.removeURL();
	}

	function handleOpen(event) {
		event.preventDefault();
		pluginState.open();
	}

	function handleEdit() {
		setEditing(true);
	}

	function handleKeydown(event) {
		if (event.key === 'Enter') {
			pluginState.setURL(inputRef.current.value);
			event.preventDefault();
		}
		else if (event.key === 'Escape') {
			pluginState.cancel();
			event.preventDefault();
		}
	}

	function handleInput(event) {
		event.target.value = event.target.value.replace(/^[a-z]+:\/\/([a-z]+:\/\/)(.*)/, '$1$2');
	}

	return (
		<Popup className="link-popup" parentRef={parentRef} pluginState={pluginState}>
			{editing
				? (
					<Fragment>
						<div className="link">
							<input
								ref={inputRef}
								type="edit"
								placeholder={intl.formatMessage({ id: 'noteEditor.enterLink' })}
								onKeyDown={handleKeydown}
								onInput={handleInput}
							/>
						</div>
						<button
							onClick={handleSet}
							title={intl.formatMessage({ id: 'noteEditor.set' })}
						>
							<IconCheckmark/>
						</button>
					</Fragment>
				)
				: (
					<Fragment>
						<div className="link"><a href={pluginState.href} onClick={handleOpen}>{pluginState.href}</a></div>
						<button
							onClick={handleEdit}
							title={intl.formatMessage({ id: 'noteEditor.edit' })}
						>
							<IconEdit/>
						</button>
						<button
							onClick={handleUnset}
							title={intl.formatMessage({ id: 'noteEditor.unlink' })}
						>
							<IconUnlink/>
						</button>
					</Fragment>
				)}
		</Popup>
	);

}

export default LinkPopup;

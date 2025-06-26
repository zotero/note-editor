'use strict';

import React, { useState, useEffect, useLayoutEffect, useRef, Fragment } from 'react';
import { useLocalization } from '@fluent/react';

import Popup from './popup';

import IconCheckmark from '../../../res/icons/16/checkmark.svg';
import IconEdit from '../../../res/icons/16/edit.svg';
import IconUnlink from '../../../res/icons/16/unlink.svg';

function LinkPopup({ parentRef, pluginState }) {
	const { l10n } = useLocalization();
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
								placeholder={l10n.getString('note-editor-enter-link')}
								onKeyDown={handleKeydown}
								onInput={handleInput}
							/>
						</div>
						<button
							onClick={handleSet}
							title={l10n.getString('note-editor-set')}
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
							title={l10n.getString('general-edit')}
						>
							<IconEdit/>
						</button>
						<button
							onClick={handleUnset}
							title={l10n.getString('note-editor-unlink')}
						>
							<IconUnlink/>
						</button>
					</Fragment>
				)}
		</Popup>
	);

}

export default LinkPopup;

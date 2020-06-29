'use strict';

import fr from '../editor-core/fr'

import React, { useState } from 'react';

//view.state.plugins.find(x => x.key === 'find-replace$').spec.options
function Findbar(props) {
  const [findValue, setFindValue] = useState('');
  const [replaceValue, setReplaceValue] = useState('');

  function handleMouseDown(event) {
    if (event.target.nodeName !== 'INPUT') {
      event.preventDefault();
    }
  }

  function handleFindPrev() {
    props.view.dom.focus();
    fr.next()(props.view.state, props.view.dispatch);
  }

  function handleFindNext(event) {
    props.view.dom.focus();
    fr.next()(props.view.state, props.view.dispatch);
  }

  function handleCaseToggle() {
    fr.next()(props.view.state, props.view.dispatch);
  }

  function handleWordToggle() {

  }

  function handleReplace() {
    props.view.dom.focus();
    fr.commands().replace(replaceValue)(props.view.state, props.view.dispatch, props.view);
  }

  function handleReplaceAll() {
    fr.commands().replaceAll(replaceValue)(props.view.state, props.view.dispatch);
  }

  function handleFindInputChange(event) {
    setFindValue(event.target.value);
    fr.commands().find(event.target.value)(props.view.state, props.view.dispatch);
  }

  function handleReplaceInputChange(event) {
    setReplaceValue(event.target.value);
  }

  let frOptions = view.state.plugins.find(x => x.key === 'find-replace$').spec.options;

  return (
    <div className="findbar" onMouseDown={handleMouseDown}>
      <div className="line">
        <div className="input">
          <input type="text" placeholder="Search…" value={frOptions.searchTerm || ''} onChange={handleFindInputChange}/>
        </div>
        <div className="controls">
          <button onClick={handleFindPrev}>Up</button>
          <button onClick={handleFindNext}>Down</button>
          <div className="toggle-button" onClick={handleCaseToggle}>C/S</div>
          <div className="toggle-button" onClick={handleWordToggle}>W</div>
        </div>
      </div>
      <div className="line">
        <div className="input">
          <input type="text" placeholder="Replace…" value={replaceValue} onChange={handleReplaceInputChange}/>
        </div>
        <div className="controls">
          <button onClick={handleReplace}>Replace</button>
          <button onClick={handleReplaceAll}>Replace All</button>
        </div>
      </div>
    </div>
  );
}

export default Findbar;

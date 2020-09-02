'use strict';
import cx from 'classnames';
import React, { useState, useEffect, useRef } from 'react';

function Findbar({ searchState, active }) {
  const [findValue, setFindValue] = useState('');
  const [replaceValue, setReplaceValue] = useState('');
  const searchInputRef = useRef();

  useEffect(() => {
    if (active) {
      setTimeout(() => {
        searchInputRef.current.focus();
      }, 100);
    }
  }, [active])

  function handleMouseDown(event) {
    if (event.target.nodeName !== 'INPUT') {
      event.preventDefault();
    }
  }

  function handleFindPrev() {
    // props.view.dom.focus();
    searchState.prev();
  }

  function handleFindNext(event) {
    // props.view.dom.focus();
    searchState.next();
  }

  function handleCaseToggle() {
    searchState.setCaseSensitive(!searchState.caseSensitive);
  }

  function handleWordToggle() {
    searchState.setWholeWords(!searchState.wholeWords);
  }

  function handleReplace() {
    // props.view.dom.focus();
    searchState.replace(replaceValue);
  }

  function handleReplaceAll() {
    searchState.replaceAll(replaceValue);
  }

  function handleFindInputChange(event) {
    setFindValue(event.target.value);
    searchState.setSearchTerm(event.target.value);
  }

  function handleReplaceInputChange(event) {
    setReplaceValue(event.target.value);
  }

  function handleFindInputKeyDown(event) {
    if (event.key === 'Escape') {
      searchState.setActive(false);
    }
  }

  function handleReplaceInputKeyDown(event) {
    if (event.key === 'Escape') {
      searchState.setActive(false);
    }
  }

  return active && (
    <div className="findbar" onMouseDown={handleMouseDown}>
      <div className="column-left">
        <div className="line">
          <input ref={searchInputRef} type="text" placeholder="Search…" value={searchState.searchTerm || ''}
                 onChange={handleFindInputChange} onKeyDown={handleFindInputKeyDown}/>
        </div>
        <div className="line">
          <input type="text" placeholder="Replace…" value={replaceValue}
                 onChange={handleReplaceInputChange} onKeyDown={handleFindInputKeyDown}/>
        </div>
      </div>
      <div className="column-right">
        <div className="line">
          <div className="toggles">
            <div className={cx('button', { active: searchState.caseSensitive })} onClick={handleCaseToggle}
                 title="Match case">Aa
            </div>
            <div className={cx('button', { active: searchState.wholeWords })} onClick={handleWordToggle}
                 title="Whole words">W
            </div>
          </div>
          <div className="buttons">
            <div className="button" onClick={handleFindPrev}>Prev</div>
            <div className="button" onClick={handleFindNext}>Next</div>
          </div>

        </div>
        <div className="line">
          <div className="buttons">
            <div className="button" onClick={handleReplace}>Replace</div>
            <div className="button" onClick={handleReplaceAll}>Replace All</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Findbar;

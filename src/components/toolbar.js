'use strict';

import React, { useState } from 'react';
import cx from 'classnames';
import ColorPicker from './toolbar-elements/color-picker';

function Button({ view, item, icon }) {
  return (
    <div
      className={cx('button', { active: item.active && item.active(view.state) })}
      title={item.title}
      disabled={item.enable && !item.enable(view.state)}
      onMouseDown={e => {
        e.preventDefault()
        item.run(view.state, view.dispatch)
      }}
    >
      <div className={cx('mce-ico', icon)}/>
    </div>
  );
}

function Dropdown(props) {
  const [isShowingList, setIsShowingList] = useState(false);

  function handleValueClick(event) {
    setIsShowingList(!isShowingList);
  }

  function handleListClick(event) {
    setIsShowingList(false);
  }

  return (
    <span className="dropdown">
      <span className="value" onClick={handleValueClick}>{props.value}</span>
      {isShowingList && <div className="list" onClick={handleListClick}>{props.children}</div>}
    </span>
  );
}

function DropdownItem(props) {
  function handleClick(event) {
    props.item.run(view.state, view.dispatch);
  }

  return (
    <div className={cx('dropdown-item', { active: props.item.active(props.view.state) })}
         onClick={handleClick}>{props.children}</div>
  );
}


function Toolbar({ menu, view }) {

  function handleMouseDown(event) {
    event.preventDefault();
  }

  return (
    <div className="toolbar" onMouseDown={handleMouseDown}>
      <Button view={view} item={menu.strong} icon="mce-i-bold"/>
      <Button view={view} item={menu.em} icon="mce-i-italic"/>
      <Button view={view} item={menu.underline} icon="mce-i-underline"/>
      <Button view={view} item={menu.strikethrough} icon="mce-i-strikethrough"/>
      <Button view={view} item={menu.subscript} icon="mce-i-subscript"/>
      <Button view={view} item={menu.superscript} icon="mce-i-superscript"/>
      <ColorPicker view={view} type={menu.textColor}/>
      <ColorPicker view={view} type={menu.backgroundColor}/>
      <Button view={view} item={menu.clearFormatting} icon="mce-i-removeformat"/>
      <Button view={view} item={menu.blockquote} icon="mce-i-blockquote"/>
      <Button view={view} item={menu.link} icon="mce-i-link"/>
      <br/>
      <Dropdown value="Paragraph">
        <DropdownItem view={view} item={menu.blocks.paragraph}>Paragraph</DropdownItem>
        <DropdownItem view={view} item={menu.blocks.heading1}><h1>Heading 1</h1></DropdownItem>
        <DropdownItem view={view} item={menu.blocks.heading2}><h2>Heading 2</h2></DropdownItem>
        <DropdownItem view={view} item={menu.blocks.heading3}><h3>Heading 3</h3></DropdownItem>
        <DropdownItem view={view} item={menu.blocks.heading4}><h4>Heading 4</h4></DropdownItem>
        <DropdownItem view={view} item={menu.blocks.heading5}><h5>Heading 5</h5></DropdownItem>
        <DropdownItem view={view} item={menu.blocks.heading6}><h6>Heading 6</h6></DropdownItem>
        <DropdownItem view={view} item={menu.blocks.code}>
          <pre>Code</pre>
        </DropdownItem>
      </Dropdown>

      <Button view={view} item={menu.alignLeft} icon="mce-i-alignleft"/>
      <Button view={view} item={menu.alignCenter} icon="mce-i-aligncenter"/>
      <Button view={view} item={menu.alignRight} icon="mce-i-alignright"/>
      <Button view={view} item={menu.bulletList} icon="mce-i-bullist"/>
      <Button view={view} item={menu.orderedList} icon="mce-i-numlist"/>
      <Button view={view} item={menu.indent} icon="mce-i-indent"/>
      <Button view={view} item={menu.outdent} icon="mce-i-outdent"/>
      <Button view={view} item={menu.outdent} icon="mce-i-searchreplace"/>

    </div>
  );
}

export default Toolbar;

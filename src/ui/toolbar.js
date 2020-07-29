'use strict';

import React from 'react';
import Button from './toolbar-elements/button';
import ColorPicker from './toolbar-elements/color-picker';
import Dropdown from './toolbar-elements/dropdown';

function Line({ children }) {
  return (
    <div className="line">{children}</div>
  );
}

function Group({ children }) {
  return (
    <div className="group">{children}</div>
  );
}

function Toolbar({ menuState, linkState, searchState }) {

  function handleMouseDown(event) {
    event.preventDefault();
  }

  return (
    <div className="toolbar" onMouseDown={handleMouseDown}>
      <Line>
        <Group>
          <Button state={menuState.strong} icon="mce-i-bold"/>
          <Button state={menuState.em} icon="mce-i-italic"/>
          <Button state={menuState.underline} icon="mce-i-underline"/>
          <Button state={menuState.strikethrough} icon="mce-i-strikethrough"/>
        </Group>
        <Group>
          <Button state={menuState.subscript} icon="mce-i-subscript"/>
          <Button state={menuState.superscript} icon="mce-i-superscript"/>
        </Group>
        <Group>
          <ColorPicker state={menuState.textColor}/>
          <ColorPicker state={menuState.backgroundColor} isBackground={true}/>
        </Group>
        <Group>
          <Button state={menuState.clearFormatting} icon="mce-i-removeformat"/>
        </Group>
        <Group>
          <Button state={menuState.blockquote} icon="mce-i-blockquote"/>
          <Button state={{ isActive: linkState.isActive, run: () => linkState.popup.toggle() }} icon="mce-i-link"/>
        </Group>
      </Line>
      <Line>
        <Group>
          <Dropdown blocks={menuState.blocks}/>
        </Group>
        <Group>
          <Button state={menuState.alignLeft} icon="mce-i-alignleft"/>
          <Button state={menuState.alignCenter} icon="mce-i-aligncenter"/>
          <Button state={menuState.alignRight} icon="mce-i-alignright"/>
          <Button state={menuState.alignJustify} icon="mce-i-alignjustify"/>
        </Group>
        <Group>
          <Button state={menuState.bulletList} icon="mce-i-bullist"/>
          <Button state={menuState.orderedList} icon="mce-i-numlist"/>
          <Button state={menuState.indent} icon="mce-i-indent"/>
          <Button state={menuState.outdent} icon="mce-i-outdent"/>
        </Group>
        <Group>
          <Button state={{ isActive: searchState.active, run: () => searchState.setActive(!searchState.active) }}
                  icon="mce-i-searchreplace"/>
        </Group>
      </Line>
    </div>
  );
}

export default Toolbar;

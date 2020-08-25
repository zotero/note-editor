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
          <Button state={menuState.strong} icon="mce-i-bold" title="Bold"/>
          <Button state={menuState.em} icon="mce-i-italic" title="Italic"/>
          <Button state={menuState.underline} icon="mce-i-underline" title="Underline"/>
          <Button state={menuState.strikethrough} icon="mce-i-strikethrough" title="Strikethrough"/>
        </Group>
        <Group>
          <Button state={menuState.subscript} icon="mce-i-subscript" title="Subscript"/>
          <Button state={menuState.superscript} icon="mce-i-superscript" title="Superscript"/>
        </Group>
        <Group>
          <ColorPicker state={menuState.textColor} title="Text color"/>
          <ColorPicker state={menuState.backgroundColor} isBackground={true} title="Background color"/>
        </Group>
        <Group>
          <Button state={menuState.clearFormatting} icon="mce-i-removeformat" title="Clear formatting"/>
        </Group>
        <Group>
          <Button state={menuState.blockquote} icon="mce-i-blockquote" title="Blockquote"/>
          <Button state={{ isActive: linkState.isActive, run: () => linkState.popup.toggle() }} icon="mce-i-link"
                  title="Link"/>
        </Group>
      </Line>
      <Line>
        <Group>
          <Dropdown blocks={menuState.blocks}/>
        </Group>
        <Group>
          <Button state={menuState.alignLeft} icon="mce-i-alignleft" title="Align left"/>
          <Button state={menuState.alignCenter} icon="mce-i-aligncenter" title="Align center"/>
          <Button state={menuState.alignRight} icon="mce-i-alignright" title="Align right"/>
          <Button state={menuState.alignJustify} icon="mce-i-alignjustify" title="Align justify"/>
        </Group>
        <Group>
          <Button state={menuState.bulletList} icon="mce-i-bullist" title="Bullet list"/>
          <Button state={menuState.orderedList} icon="mce-i-numlist" title="Numbered list"/>
          <Button state={menuState.outdent} icon="mce-i-outdent" title="Decrease indent"/>
          <Button state={menuState.indent} icon="mce-i-indent" title="Increase indent"/>
        </Group>
        <Group>
          <Button state={{ isActive: searchState.active, run: () => searchState.setActive(!searchState.active) }}
                  icon="mce-i-searchreplace" title="Find and replace"/>
        </Group>
      </Line>
    </div>
  );
}

export default Toolbar;

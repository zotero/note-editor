import React from 'react';
import ReactDOM from 'react-dom';


import Editor from './components/editor'


function main(html) {

  ReactDOM.unmountComponentAtNode(document.getElementById('editor-container'));


  let editorCore = null;

  ReactDOM.render(
    <Editor
      html={html}
      onInit={(ec) => {
        editorCore = ec;
        window.editorCore = editorCore;
      }}
      onUpdate={() => {
        console.log('onUpdate');
      }}
      onOpenUrl={(url) => {
        console.log('onOpenUrl', url);
      }}
      onUpdateCitations={(citations) => {
        console.log('onUpdateCitations', citations);
      }}
      onOpenCitationPopup={(id, citation) => {
        console.log('onOpenCitationPopup', id, citation);
      }}
      onInsertObject={(type, data, pos) => {
        console.log('onInsertObject', type, data, pos);

        if (type === 'zotero/item') {
          let ids = data.split(',').map(id => parseInt(id));

          let citations = [];
          for (let id of ids) {
            citations.push(
              {
                citationItems: [
                  {
                    uri: 'uri1',
                    backupText: 'item' + id
                  }
                ],
                properties: {}
              }
            );
          }

          editorCore.insertCitations(citations, pos);
        }
        else if (type === 'zotero/annotation') {
          let annotations = JSON.parse(data);

          let list = [];
          for (let annotation of annotations) {
            let pdfCitationItem = { uri: 'asdf', backupText: 'test1' };
            let parentCitationItem = { uri: 'asdf', backupText: 'test1' };

            annotation.uri = pdfCitationItem.uri;

            let citation = {
              citationItems: [parentCitationItem || pdfCitationItem],
              properties: {}
            };

            citation.citationItems[0].locator = annotation.pageLabel;

            list.push({ annotation, citation });

          }

          editorCore.insertAnnotationsAndCitations(list, pos);

        }

        console.log('onInsertObject', type, data, pos);
      }}
      onNavigate={(uri, position) => {
        console.log('onNavigate', uri, position)
      }}
    />,
    document.getElementById('editor-container')
  );
}

let html1 = `
<h1 style="">This is my paper draft</h1>
<p style="">And here is my first citation: <span class="highlight" data-item-uri="http://zotero.org/users/local/mvHFv2Zs/items/FESZRMJE" data-annotation="%7B%22attachmentItemKey%22%3A%22FESZRMJE%22%2C%22itemId%22%3A30%2C%22text%22%3A%22gluten-free%20formulations%20have%20been%20developed%20with%20the%20help%20of%20nongluten%20components%20such%20as%20starches%20and%20hydrocolloids%20to%20mimic%20the%20viscoelastic%20properties%20of%20gluten%20and%20to%20improve%20the%20final%20quality%20of%20bread%20%22%2C%22position%22%3A%7B%22pageIndex%22%3A1%2C%22rects%22%3A%5B%5B139.66760328339004%2C609.130173339%2C289.3536032948499%2C621.490173339%5D%2C%5B51.023603291%2C596.630173339%2C289.14260330244997%2C608.990173339%5D%2C%5B51.023603291%2C584.130173339%2C289.13360329100004%2C596.490173339%5D%2C%5B51.02360329100003%2C571.630173339%2C275.05560329291023%2C583.990173339%5D%5D%7D%2C%22pageLabel%22%3A%222%22%2C%22uri%22%3A%22http%3A%2F%2Fzotero.org%2Fusers%2Flocal%2FmvHFv2Zs%2Fitems%2FFESZRMJE%22%7D">"gluten-free formulations have been developed with the help of nongluten components such as starches and hydrocolloids to mimic the viscoelastic properties of gluten and to improve the final quality of bread "</span> </p>
<p style=""><span class=\"citation\" data-citation=\"%7B%22citationItems%22%3A%5B%7B%22uri%22%3A%22asdf%22%2C%22backupText%22%3A%22test1%22%2C%22locator%22%3A%222%22%7D%5D%2C%22properties%22%3A%7B%7D%7D\"></span></p>

`;

main(html1);

// setTimeout(() => {
//
// let html2 = `<p>test</p>`
// main(html2);
//
// }, 3000);

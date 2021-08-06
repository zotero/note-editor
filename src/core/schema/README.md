# Schema migration

## Rules

- `div[data-schema-version]` container must never be removed, although it's a hack that allows `data-schema-version` to
  survive TinyMCE based editor
- `zotero-note-editor` must never save the opened note without user triggered note modification
- Image attachments can be affected by schema changes
- As long as sync cut-off is not applied to all TinyMCE based Zotero versions, the new schema must never introduce
  elements or attributes not listed in TinyMCE valid elements list below
- `data-schema-version` increase forces all `< data-schema-version`
  clients to open the note in read-only mode and prevent wiping new data introduced in the newer editor
- `data-schema-version` must be increased every time the schema output is affected, although not necessary when only the
  importing part is modified
- `data-schema-version` can be increased without doing TinyMCE based Zotero cut-off to older clients, although that
  means only very old and very new clients can modify the note
- Any future schema must be able to import any previously produced note

## Examples

| Case | Cut-off TinyMCE based Zotero | Increase `data-schema-version` (and force read-only) | Comment |
| --- | --- | --- | --- |
| `codeBlock` gets a new attribute called `data-language` | no | yes |  |
| Introduce `<s>` element | yes | no |  |
| Introduce `<audio>` element | yes | yes |  |
| Add property `color` to `data-annotation` JSON | no | no | New schemas must expect `color` to be missing |
| Rename property `uri` into `itemURI` in `data-annotation` JSON | no | yes | Older editors will throw erros on some operations. New editors must fallback to `uri` |
| Introduce `overline` mark (`style="text-decoration: overline"`) | no | yes |  |
| Introduce `mindmap` node (`div[class="mindmap"]`) | no | yes |  |
| Introduce image URL import from `srcset` | no | no |  |
| Remove inline `code` mark | no | no |  |
| Rename attribute `data-attachment-key` to `data-attachment-data` | no | yes | `data-schema-version` increase prevents attachments deletion |

## [TinyMCE valid elements list](https://github.com/zotero/zotero/blob/3f3b6501ce0e2313d3904ae5c0a1a8558204a9ae/resource/tinymce/note.html)

```
all data-* attributes
valid_elements: "@[id|class|style|title|dir<ltr?rtl|lang|xml::lang],"
			+ "a[rel|rev|charset|hreflang|tabindex|accesskey|type|name|href|target|title|class],"
			+ "strong/b,"
			+ "em/i,"
			+ "strike,"
			+ "u,"
			+ "#p,"
			+ "-ol[type|compact],"
			+ "-ul[type|compact],"
			+ "-li,"
			+ "br,"
			+ "img[longdesc|usemap|src|border|alt=|title|hspace|vspace|width|height|align],"
			+ "-sub,-sup,"
			+ "-blockquote[cite],"
			+ "-table[border=0|cellspacing|cellpadding|width|frame|rules|height|align|summary|bgcolor|background|bordercolor],"
			+ "-tr[rowspan|width|height|align|valign|bgcolor|background|bordercolor],"
			+ "tbody,thead,tfoot,"
			+ "#td[colspan|rowspan|width|height|align|valign|bgcolor|background|bordercolor|scope],"
			+ "#th[colspan|rowspan|width|height|align|valign|scope],"
			+ "caption,"
			+ "-div,"
			+ "-span,"
			+ "-code,"
			+ "-pre,"
			+ "address,"
			+ "-h1,-h2,-h3,-h4,-h5,-h6,"
			+ "hr[size|noshade],"
			+ "-font[face|size|color],"
			+ "dd,dl,dt,"
			+ "cite,"
			+ "abbr,"
			+ "acronym,"
			+ "del[datetime|cite],ins[datetime|cite],"
			+ "bdo,"
			+ "col[align|char|charoff|span|valign|width],colgroup[align|char|charoff|span|valign|width],"
			+ "dfn,"
			+ "kbd,"
			+ "label[for],"
			+ "legend,"
			+ "q[cite],"
			+ "samp,"
			+ "var,",
```

## Versions

- v2 c5dfc982 zotero/zotero@415e644
  - Add `data-citation-items` metadata property to store an array of `{ uris, itemData }`
  - Pull itemData from citations, highlights, images into metadata container `data-citation-items` property, to reduce note size
  - Keep only the following annotation properties:
    - uri
	- text
	- color
	- pageLabel
	- position
	- citationItem
- v3 c801eb5d zotero/zotero@3beb858
  - Remove `annotation.text` and the code that uses it
- v4 8af929c3
  - Use `annotation.attachmentURI` instead of `annotation.uri` for newly inserted annotations
  - Fallback to `annotation.uri` if `annotation.attachmentURI` doesn't exist
  - Add `annotation.annotationKey` to reference the original annotation

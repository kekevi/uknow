import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {createEditor, Editor, Transforms, Text} from 'slate';
import {Slate, Editable, withReact} from 'slate-react';
import './SlateEditor.css';

function SlateEditor() {
    const editor = useMemo(() => withReact(createEditor()), [])
    const [value, setValue] = useState([{
      type: "paragraph",
      children: [{text: "Something"}], // this has to be blank or it bugs out,
                              // or you can add //@refresh reset at top
                              // or some other stuff https://github.com/ianstormtaylor/slate/issues/3477
    }])
  
    // Block Rendering
    const renderElement = useCallback((props) => {
      switch (props.element.type) {
        case 'event':
          return <EventElement {...props} />
        default:
          return <DefaultElement {...props} />
      }
    }, []);
  
    // Leaf Rendering
    const renderLeaf = useCallback((props) => {
      return <Leaf {...props} />
    }, []);
  
    return (
      <div className="slateEditor">
          <Slate editor={editor} value={value} className="slate"
           onChange={newValue => { console.log(editor.children);
             setValue(newValue)}}>
            <Editable 
              renderElement={renderElement}
              renderLeaf={renderLeaf}
              onKeyDown={e => processKeyDownEvent(e, editor)}
            />
          </Slate>
      </div>
    );
  }
  
  function processKeyDownEvent (event, editor) {
    //console.log(event.key);
  
    if (!event.ctrlKey) {
      return;
    }
  
    switch (event.key) {
      // Event Block
      case 'e': { 
        event.preventDefault();
        const [match] = Editor.nodes(editor, {
          match: (n) => n.type === "event"
        });
        Transforms.setNodes(
          editor,
          {type: match ? "paragraph" : "event" },
          {match: (n) => Editor.isBlock(editor, n)}
        );
        break;
      }
      case 'Enter': {
        // event.preventDefault();
        const [match] = Editor.nodes(editor, {
          match: (n) => n.type === "event"
        });
        if (match == "event") {
          console.log("actually did something")
          Transforms.setNodes(
            editor,
            {type: "paragraph"},
            {match: (n) => {}} //Editor.isBlock(editor, n)}
          )
        }
      }
      // Bold Font
      case 'b': {
        event.preventDefault();
        const [match] = Editor.nodes(editor, {
          match: (n) => n.bold === true
        });
        // Transforms.setNodes(
        //   editor,
        //   {bold: match ? false : true},
        //   // applying to text nodes in selection
        //   {match: (n) => Text.isText(n), split: true}
        // );
        Editor.addMark(editor, 'bold', match ? false : true);
        break;
      }
      // Italic Font
      case 'i': {
        event.preventDefault();
        const [match] = Editor.nodes(editor, {
          match: (n) => n.italic == true
        });
        Editor.addMark(editor, 'italic', match ? false : true);
        break;
      }
      // Underline Font
      case 'u': {
        event.preventDefault();
        const [match] = Editor.nodes(editor, {
          match: (n) => n.underline == true
        });
        Editor.addMark(editor, 'underline', match ? false : true);
        break;
      }
      // Code Font
    }
  }
  
  
  // Slate Blocks:
  const EventElement = (props) => {
    return(
      //<pre {...props.attributes}>
        <div className="event_text" {...props.attributes}>{props.children}</div>
      //</pre>
    )
  }
  
  const DefaultElement = (props) => {
    return <p className="normal_text" {...props.attributes}>{props.children}</p>
  }
  
  // Slate Leafs (inlines):
  const Leaf = (props) => {
    const leafStyle = {
      fontWeight: props.leaf.bold ? "bold" : "normal",
      fontStyle: props.leaf.italic ? "italic" : "normal",
      textDecoration: props.leaf.underline ? "underline" : "normal"
    }
    return (
      <span {...props.attributes} style={leafStyle}>
        {props.children}
      </span>
    )
  }

export default SlateEditor;
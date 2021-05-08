const PARSE_ELEMENT = "event"

/**
 * 
 * @param {Array} elements - editor.children - a list of Slate Element in 
 * the editor. 
 * @returns an array of BlockElement objects that should be sent to 
 * the DayScheduler 
 */
function parse(elements) {
    let eventElements = elements.filter((element) => element.type == PARSE_ELEMENT);
    
}

/*
    Here is the input JSON:
    [{
      type: <paragraph | event >,
      children: [
        {
          text: <string>,
          <css>: <CSS Color>
        }
      ]
      
    }, ... ]
*/


/*
    Here is the return JSON:
    [{
      title: <string>,
      date: <(JS) Date>,
      beginHour: <int>,         /^^
      beginMinute: <int>,           These should be replaced with
      endHour: <int>,               just the date tools
      endMinute: <int>,         /^^
      description: <string>,
      category: {
        name: <str>,
        color: <CSS Color>
      }
    }, ... ]
*/
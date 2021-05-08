import React, { Component, useState } from 'react';
import './Weekbar.css';

/**
    Weekbar Component
    - has days of the week
    - has dates of those days
    - has bullets of top three things of each day, essentially due dates
        -> should auto calculate that
    - has a red border indicating current selected day
    - has 7 slots to insert click events
    - includes prev, next week buttons
*/

/**
 * A React component.
 * A day selector with little blurbs in them of the top three most important notes.
 * 
 * TODO:
 * - Make the list of text scrollable w/ pretty UI
 * - Better "shortify()" logic, or replace with above
 * - CSS for the days, move currently selected box to outside
 * @param {Props} props 
 * @returns 
 */
function Weekbar (props) {
    const [selected, setSelected] = useState(7); // where 0=Sunday, 1=Mon, ... , 6=Sat, 7=None
    const week = props.week;
    return (
        <div className="weekbar_anchor">
            <div className="weekbar_box">
                <Weekday day={week.days[0]}/>
                <Weekday day={week.days[1]}/>
                <Weekday day={week.days[2]}/>
                <Weekday day={week.days[3]}/>
                <Weekday day={week.days[4]}/>
                <Weekday day={week.days[5]}/>
                <Weekday day={week.days[6]}/>
            </div>
        </div>
    );
}

function Weekday (props) {
    return (
        <div className="weekday">
            <p><span className="weekday_dayNumber">{props.day.number}</span>{props.day.of_week}</p>
            <div className="weekday_box">
                <div className="weekday_contents">
                    {shortify(props.day.notes)}
                </div>
            </div>
        </div>
    );
}

/**
 * shortify - parses a Slate 
 * @param {Array} slateElementList - the Slate Editor.children list of Element (block)
 * whose children are a list of Text (leafs)
 */
function shortify(slateElementList) {
    const MAX_ROW_LENGTH = 15;
    const firstThreeElements = slateElementList.slice(0,3);
    
    let elementStrings = [];
    firstThreeElements.forEach((element) => {
        let elementString = "";
        element.children.forEach((leaf) => {
            elementString += leaf.text;
        })
        console.log(elementString);
        elementStrings.push(elementString.substring(0, MAX_ROW_LENGTH));
    });
    return (
        <div>
            <p className="weekday_contents_line">{elementStrings[0]}</p>
            <p className="weekday_contents_line">{elementStrings[1]}</p>
            <p className="weekday_contents_line">{elementStrings[2]}</p>
        </div>
    )
}

export default Weekbar;


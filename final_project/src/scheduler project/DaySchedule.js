import React, {useCallback, useEffect, useMemo, useState} from 'react'
import './DaySchedule.css';

/* Apparently '%' is not modulo in Javascript. It is simply remainder... */
function mod(a, b) {
    return ((a % b) + b) % b;
}

/*
    Event Object
    {
        title: <string>,
        beginTime: <Date>,
        endTime: <Date>,
        description: <string>,
        category: {
            backgroundColor: <CSS string>
        }
    }
*/

const MIN_BLOCK_PX = 10;

/**
 * Schedule - a React Component
 * A Google Calendar Daily View-like schedule that will process
 * click events and can be filled with "Blocks", ie. "Events" that
 * are segments on the schedule itself.
 * 
 * TODO:
 * - support stacking of EventBlocks, upto 4
 * - onClick will give approximate time a user has clicked, along with meta-data like day of Schedule
 * - toggable time with timezone
 * - line that follows current time
 */
function DaySchedule (props) {
    const date = props.date;
    const hourSpan = props.hourSpan;
    const listEvents = props.listEvents;
    const width = props.width;
    // need a function to calculate height based on size of Schedule itself
    function calculateBuffer(hourSpan, beginHour, beginMinute) {
        return hourSpan * (beginHour + beginMinute / 60);
    }

    function calculateHeight(hourSpan, beginHour, beginMinute, endHour, endMinute) {
        return calculateBuffer(hourSpan, endHour, endMinute) - calculateBuffer(hourSpan, beginHour, beginMinute);
    }

    // Creating time strip
    let lineNumberPairs = []; // should be able to change this to another scale
    for (let h = -12; h < 12; h++) {
        lineNumberPairs.push(
            <LineNumberPair 
                hour={mod(h, 12) == 0 ? 12 : mod(h, 12)} 
                tod={h < 0 ? "AM" : "PM"} 
                height={hourSpan} 
                key={date.getFullYear().toString() + date.getMonth() + date.getDate()  + h}
            />
        );
    }

    // Adding Column Events
    const discernableTimePerHour = Math.round(hourSpan / MIN_BLOCK_PX);
    let eventHistorgram = Array(24*discernableTimePerHour).fill(0); // creates an array representation of number of events
    const timeToHistIndex = (histLength, hour, minute, isStart) => {
        const time = hour + minute / 60;
        return isStart ? Math.floor(time / 24 * histLength) : Math.ceil(time / 24 * histLength);
    }

        // filling the eventHistogram
    listEvents.forEach((event) => {
        const beginIndex = timeToHistIndex(eventHistorgram.length, event.beginHour, event.beginMinute, true);
        const endIndex = timeToHistIndex(eventHistorgram.length, event.endHour, event.endMinute, false); // note, endIndex should be exclusive
        for (let i = beginIndex; i < endIndex; i++) {
            eventHistorgram[i]++;
        }
    });

    let orderHistorgram = eventHistorgram.map((x) => x);

    const todaysEvents = listEvents.map((event, i) => {
        /*
            TODO
            - set minimum height based on hourSpan
        */

        // get stack property
        const beginIndex = timeToHistIndex(eventHistorgram.length, event.beginHour, event.beginMinute, true);
        const endIndex = timeToHistIndex(eventHistorgram.length, event.endHour, event.endMinute, false);
        const stackvalues = eventHistorgram.slice(beginIndex, endIndex);
        const highestStackValue = stackvalues.reduce((max, curr) => Math.max(max, curr), stackvalues[0]);
        
        // get order property
        console.log(orderHistorgram, "before")
        for (let i = beginIndex; i < endIndex; i++) {
            orderHistorgram[i]--;
        }
        console.log(orderHistorgram, "after");
        const ordervalues = orderHistorgram.slice(beginIndex, endIndex);
        const highestOrderValue = ordervalues.reduce((max, curr) => Math.max(max, curr), ordervalues[0]);
        return (
            <EventBlock 
                // passing the Event object
                // \/ expanded \/
                // beginHour={}
                // beginMinute={}
                // endHour={}
                // endMinute={}
                // title={}
                // description={}
                event={event}
                buffer={calculateBuffer(hourSpan, event.beginHour, event.beginMinute)} // top pixel 
                height={calculateHeight(hourSpan, event.beginHour, event.beginMinute, event.endHour, event.endMinute)}
                width={width}
                stack={highestStackValue} // how many other events are at same time
                order={highestOrderValue} // whether it should be the 1st, 2nd, ..., order-th block in a stack
                key={date.getFullYear().toString() + date.getMonth() + date.getDate() + i}
            />
        );
    });

    return (
        <div className="schedule_anchor">
            <div className="timestrip">
                {lineNumberPairs}
            </div>
            <div className="schedule_column">
                {todaysEvents}
            </div>
        </div>
    );
}

function LineNumberPair (props) {
    return (
        <div className="lineNumberPair" style={{height: props.height}}>
            <hr className="lineNumberPair_horizontal" />
            <div className="lineNumberPair_time">{props.hour} {props.tod}</div>
        </div>
    );
}

function EventBlock (props) {
    // remember to do something with "stack" prop
    const event = props.event;
    console.log(event);
    const blockStyle = {
        backgroundColor: event.category.color,
        top: props.buffer,
        left: (props.order) * (props.width / props.stack),
        height: props.height,
        width: props.width / props.stack
    }
    return (
        <button className="eventblock" style={blockStyle}>
            <p className="eventblock_title">{event.title}</p>
            <p className="eventblock_time">{`${event.beginHour}:${event.beginMinute}-${event.endHour}:${event.endMinute}`}</p>
            <p className="eventblock_description">{event.description}</p>
        </button>
    );
}

export default DaySchedule;
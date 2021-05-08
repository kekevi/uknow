import React from 'react';
import './Card.css';


/**
 * #### Card
 * Props:
 * - card = {color, value} (ignored if isFlipped)
 * - isFlipped (optional)
 * - onTouch (optional) (ignored if isFlipped)
 * requires the color and value property
 * TODO optional size properties
 */
function Card (props) { 
    if (props.isFlipped) {
        return (
            <div className={`card flipped ${props.className}`}>
                <div className="inner red"></div>
                <p className="value uno_text">U-KNOW</p>
            </div>
        );
    }

    const handleTouch = (e) => {
        e.preventDefault(); // idk if I need this
        if (props.onTouch) {
            props.onTouch(props.card);
        }
    };

    let smaller;
    switch (props.card.value) {
        case "wild":
            smaller = "smaller";
            break;
        default:
            smaller = "";
    }

    let value;
    switch (props.card.value) {
        case "skip":
            value = '\u00f8';
            break;
        case "reverse":
            value = "\u2927";
            break;
        case "-1":
            value = "?"
            break;
        default:
            value = props.card.value;
    }

    // why can't you call functions in html code?
    value = String(value).toUpperCase();

    return (
        <div className={`card ${props.card.color} ${props.className}`} onClick={handleTouch}>
            <div className="inner"></div>
            <p className={`value ${smaller}`}>{value}</p>
        </div>
    );
}

export default Card;
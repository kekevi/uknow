import React from 'react';
import './Hand.css';
import Card from './Card.js';
import { findByLabelText } from '@testing-library/dom';
import axios from 'axios';

/**
 *  A scrollable collection of cards.
 *  Takes in:
 *  - game
 *  - asplayer
 *  - show (clickable)
 *  - isVertical
 *  - onPlace - a callback function sent with the card pressed
 */
function Hand(props) {
    if (props.asplayer >= props.game.getGameState().hands.length) {
        return (
            <div className="hand_window">
                {`No player ${props.asplayer}.`}
            </div>
        );
    }

    const placeCard = (c) => {
        console.log(`Player ${props.asplayer} placed card ${JSON.stringify(c)}`);
        props.onPlace(c);
    }

    const hand = props.game.getGameState().hands[props.asplayer];
    const cards = hand.map((card, i) => {
        if (props.show) {
            return <Card card={card} key={`card${props.asplayer}_${i}`} onTouch={placeCard} />;
        } else {
            return <Card isFlipped={true} key={`card${props.asplayer}_${i}`} />;
        }
    });

    const orientationStyle = props.isVertical ? {
        maxWidth: 100,
        maxHeight: 600,
        overflowX: "hidden",
        overflowY: "auto"
    }
    :
    {
        maxWidth: 550,
        maxHeight: 130,
        overflowX: "auto",
        overflowY: "hidden",
        display: "flex",
        flexDirection: "row",
    };

    return (
        <div className="hand_window" style={orientationStyle}>
            {cards}
        </div>
    );
}

export default Hand;
import React, {useState} from 'react';
import axios from 'axios';
import Hand from './Hand.js';
import Player from './Player.js';
import Card from './Card.js';
import './Game.css';

const DOMAIN_NAME = "http://localhost:3001";
const HTTP_TIMEOUT = 3000
const CORS_SITE = "http://localhost"

function Game (props) {
    const [message, setMessage] = useState("");
    const [c, setC] = useState({game: props.game});
    const wildcolor = React.useRef(null);

    const refresh = async (willWait) => {
        // if (willWait) {
        //     setTimeout(async () => {
        //         try {
        //             const response = await axios({
        //                 url: `${DOMAIN_NAME}/game/${props.lobby}`,
        //                 method: "get",
        //                 timeout: HTTP_TIMEOUT,
        //                 responseType: "json"
        //             });
        //             c.game.loadGameState(response.data);
        //             setC({game: c.game});
        //         } catch {
        //             console.log("error refreshing");
        //         }
        //         console.log("am waiting");
        //         refresh(true);
        //     }, 4000);
        // }
        try {
            const response = await axios({
                url: `${DOMAIN_NAME}/game/${props.lobby}`,
                method: "get",
                timeout: HTTP_TIMEOUT,
                responseType: "json"
            });
            c.game.loadGameState(response.data);
            setC({game: c.game});
        } catch {
            console.log("error refreshing");
        }
        console.log("am waiting");
    }

    function showMessage(msg) {
        setTimeout(() => {
            setMessage("");
        }, 3000);
        setMessage(msg);
        return;
    }

    const pushUpdate = async () => {
        try {
            const result = await axios({
                url: `${DOMAIN_NAME}/game/${props.lobby}`,
                method: "put",
                data: {
                    data: JSON.stringify(c.game.getGameState())
                },
                timeout: HTTP_TIMEOUT,
                responseType: "json"
            });
            refresh();
        } catch {
            // timed out, bad request?
        }
    }

    const placeCard = async (card) => {
        if (!c.game.isMyTurn(props.asplayer)) {
            showMessage("It's not your turn!");
        }

        if (c.game.try(card, wildcolor.current.value, props.asplayer) ) {
            // axios updateGame
            pushUpdate();
        } else {
            setMessage("Card doesn't match!");
        }
    }

    const onDraw = async () => {
        if (c.game.draw(props.asplayer)) {
            pushUpdate();
        } else {
            showMessage("It's not your turn!");
        }
    }

    const onSkip = async () => {
        if (c.game.skip(props.asplayer)) {
            pushUpdate();
        } else {
            showMessage("It's not your turn!");
        }
        console.log(c.game.getGameState());
    }

    return (
        <div className="App game">
            <div className="rows">
                <div className="row_side">
                    <Hand game={c.game} asplayer={2} show={props.asplayer==2} isVertical={false} onPlace={placeCard}/>
                </div>
                <div className="row_center">
                    <div className="spacer"></div>
                    <Hand game={c.game} asplayer={3} show={props.asplayer==3} isVertical={true} onPlace={placeCard}/>
                    <div>
                        <div className="game_center">
                            <div className="direction_indicator">{c.game.getGameState().is_forward ? '\u2b6f' : '\u2b6e'}</div>
                            <Deck onDraw={onDraw} />
                            <Card card={c.game.getGameState().top} />
                            <div className="individual_options" >
                                <button onClick={onSkip}>Next Turn</button>
                                <button onClick={refresh}>Refresh</button>
                                <div>
                                    <label htmlFor="wildcolor">Wild Card Color:</label>
                                    <select className="wildcolor" name="wildcolor" ref={wildcolor}>
                                        <option value="red" className="red">Red</option>
                                        <option value="blue" className="blue">Blue</option>
                                        <option value="green" className="green">Green</option>
                                        <option value="yellow" className="yellow">Yellow</option>
                                    </select>
                                </div>
                            </div>                      
                        </div>
                        <p className="game_error">
                            {message}
                        </p>
                        <p className="disclaimer">
                            Note: Normally it has an auto-refresh but for now you have to press 
                            refresh after other people move because I do not want
                            to pay for Heroku.
                        </p>
                    </div>
                    <Hand game={c.game} asplayer={1} show={props.asplayer==1} isVertical={true} onPlace={placeCard}/>
                    <div className="spacer"></div>
                </div>
                <div className="row_side">
                    <Hand game={c.game} asplayer={0} show={props.asplayer==0} isVertical={false} onPlace={placeCard}/>
                </div>
                <div className="fun_facts">
                    {/* {props.asplayer} */}
                </div>
            </div>
        </div>
    );
}

function Deck(props) {
    // on click, call a game update to add a new card
    const callDraw = () => {
        console.log("hello");
    }

    return (
        <div className="deck" onClick={props.onDraw}>
            <Card className="deck_card" isFlipped={true} />
            <Card className="deck_card_higher" isFlipped={true} />
            <Card className="deck_card_highest" isFlipped={true} />
            <div className="deck_tooltip">
                <p className="deck_tooltiptext">
                    Draw a new card! 
                    <span className="minortext"> You must do this if you have no matching cards!</span>
                </p>
            </div>
        </div>
    );
}

export default Game;
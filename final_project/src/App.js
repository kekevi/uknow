import logo from './resources/uknowlogo.png';
import './App.css';
import React, {useCallback, useEffect, useMemo, useState} from 'react'
import axios from 'axios';
import {UnoGame} from './engine/uno.js';
import Player from './Player.js';
import './Card.css';
import Game from './Game.js';
import * as CONSTANTS from './constants.js';

const DOMAIN_NAME = CONSTANTS.DOMAIN_NAME;
const HTTP_TIMEOUT = CONSTANTS.HTTP_TIMEOUT;
const CORS_SITE = CONSTANTS.CORS_SITE;


function App() {
    const [session, setSession] = useState({
        token: "token on refresh",
        expiration: 1 // in seconds
    });
    const [c, setC] = useState({game: null, asplayer: null, lobby: null});
    const [message, setMessage] = useState("");
    const [players, setPlayers] = useState([]);

    const handleTokenRetrieval = (retrieved) => {
        setSession(retrieved);
    };

    if (session.expiration < Date.now() / 1000) { // is expired
        return <LoginPage onToken={handleTokenRetrieval}/>;
    }

    let game;
    let asplayer;

    // I am not sure if try catch will work, axios may not throw exception
    // and instead just record result as a failure
    const handleConfiguration = async (properties) => {
        let configurable = true;

        if (properties.isCreate) { // Creating a game...
            game = new UnoGame(parseInt(properties.num_players, 10), parseInt(properties.hand_size, 10));
            asplayer = 0;
            // POST new game's state to server w/ room code
            try {
                const result = await axios({
                    url: `${DOMAIN_NAME}/game/create`,
                    //headers: {"Access-Control-Allow-Origin": `${CORS_SITE}`},
                    method: "post",
                    data: {
                        creator: session.token,
                        lobby: properties.lobby,
                        data: JSON.stringify(game.getGameState()),
                        numplayers: properties.num_players
                    },
                    timeout: HTTP_TIMEOUT,
                    responseType: "json"
                });
                
                //console.log(result.data);
            } catch {
                configurable = false;
            }

        } else { // Joining a game
            game = new UnoGame();
            
            try {
                // GET all players already in the lobby to get asplayer
                const result = await axios({
                    url: `${DOMAIN_NAME}/game/players/${properties.lobby}`,
                    //headers: {"Access-Control-Allow-Origin": `${CORS_SITE}`},
                    method: "get",
                    timeout: HTTP_TIMEOUT,
                    responseType: "json"
                });

                asplayer = result.data.length;

                // POST the player to the game
                const result2 = await axios({
                    url: `${DOMAIN_NAME}/game/${properties.lobby}`,
                    method: "post",
                    data: {
                        token: session.token,
                        asplayer: asplayer
                    },
                    timeout: HTTP_TIMEOUT,
                    responseType: "json"
                });
                
                game.loadGameState(result2.data.data);

                console.log(game.getGameState());
                
                // start refresh as it waits for own turn:
                
            } catch {
                // console.log(result.statusText);
                configurable = false;
            }
        }

        if (configurable) {
            setC({game, asplayer, lobby: properties.lobby});
        } else {
            setMessage("An error has occured. Make sure the lobby exists.")
        }
    }

    if (c.game == null) {
        return (
            <div className="App configure login">
                <div className="center">
                    <h3>Create or join a game!</h3>
                    <ConfigureGame onConfig={handleConfiguration}/>
                    <p>{message}</p>
                </div>
            </div>
        );
    }

    const refreshPlayers = async () => {
        const result = await axios({
            url: `${DOMAIN_NAME}/game/players/${c.lobby}`,
            method: "get",
            timeout: HTTP_TIMEOUT,
            responseType: "json"
        });
        const players = result.data;
        console.log(players);
        setPlayers(players.map((player) => {
            return <Player player={player} key={player.username}/>;
        }));
    };


    return (
        <div className="full">
            <div className="headbar">
                <div className="playerlist">
                    <div className="playerlist_list">
                        <button className="button_refresh" onClick={refreshPlayers}>Refresh Player List</button>
                        <div className="playerlist_list">{players}</div>
                    </div>
            </div>
            </div>
            <Game game={c.game} asplayer={c.asplayer} lobby={c.lobby}/>
            <div className="tailbar">
                <p>Made by Kevin Chen</p>
                <p>Ripoff of Hasbro's Uno</p>
            </div>
        </div>
    );
}

function LoginPage(props) {
    return (
      <div className="App login">
        <div className="center">
          <img className="logo" src={logo} height={80}/>
          <p className="login_desc">
            A <em>very</em> familiar card game. Designed for UNC's COMP 426 Final Project by Kevin Chen (kekevi).
          </p>
          <p className="login_desc">
            Note: Do NOT enter any real passwords below. Passwords in the database 
            are encrypted using SHA256 implemented by Python's secrets library, but 
            in the HTTP request they are NOT encrypted. I have not yet taken COMP 435/535 yet!
          </p>
          <h3>Login or signup below!</h3>
          <LoginForm onToken={props.onToken}/>
        </div>
      </div>
    )
}
  
function LoginForm(props) {
    const [isLogin, setIsLogin] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");

    const username = React.useRef(null);
    const password = React.useRef(null);

    const toggleLogin = () => {
        if (isLogin) {
        setIsLogin(false);
        } else {
        setIsLogin(true);
        }
    }

    const handleLogin = async (e) => {
        e.preventDefault();
        const loginData = {
        username: username.current.value,
        password: password.current.value
        };

        // skip login: (TODO remove in final)
        if (loginData.username == "skip") {
            props.onToken({
                token: "fake",
                expiration: 19999999999 // in seconds
            })
        }

        try {
        const result = await axios({
            url: `${DOMAIN_NAME}/login`,
            //headers: {"Access-Control-Allow-Origin": `${CORS_SITE}`},
            method: "post",
            data: loginData,
            timeout: HTTP_TIMEOUT,
            responseType: "json"
        });
        props.onToken(result.data);
        } catch {
        setErrorMessage("Invalid credentials, check username and password.");
        }
    }

    const handleSignup = async (e) => {
        e.preventDefault();
        const loginData = {
            username: username.current.value,
            password: password.current.value
        };
        try {
            const result = await axios({
                url: `${DOMAIN_NAME}/signup`,
                //headers: {"Access-Control-Allow-Origin": `${CORS_SITE}`},
                method: "post",
                data: loginData,
                timeout: HTTP_TIMEOUT,
                responseType: "json"
            });
        props.onToken(result.data);
        } catch {
            setErrorMessage("Username might be taken. Either log in or choose a new username.");
        }
    }

    return (
        <form className="login_form" onSubmit={isLogin ? handleLogin : handleSignup}>
        <div className="login_input">
            <label htmlFor="username">Username: </label>
            <input ref={username} type="text" id="username" name="username" required/>
        </div>
        <div className="login_input">
            <label htmlFor="password">Password: </label>
            <input ref={password} type="password" id="password" name="password" required />
        </div>
        <div className="login_buttons">
            <button className="button action" type= "button" onClick={toggleLogin}>{isLogin ? "Sign Up Instead" : "Login Instead"}</button>
            <button className="button_submit" type="submit">{isLogin ? "Login" : "Sign Up"}</button>
        </div>
        {errorMessage == "" ? "": <div className="login_errormsg">{errorMessage}</div>}
        </form>
    );
}

function ConfigureGame(props) {
    const num_players = React.useRef(null);
    const hand_size = React.useRef(null);
    const createlobby = React.useRef(null);
    const joinlobby = React.useRef(null);

    const [numPlayers, setNumPlayers] = useState(2);
    const [handSize, setHandSize] = useState(7)

    const updateNumPlayers = (rade) => {
        setNumPlayers(rade.target.value);
    };

    const updateHandSize = (rade) => {
        setHandSize(rade.target.value);
    };

    const handleCreateGame = async (buttone) => {
        buttone.preventDefault();
        props.onConfig( { // properties
            isCreate: true,
            num_players: parseInt(numPlayers, 10),
            hand_size: parseInt(handSize, 10),
            lobby: createlobby.current.value
        });
    };

    const handleJoinGame = async (buttone) => {
        buttone.preventDefault();
        props.onConfig( { // properties
            isCreate: false,
            num_players: null, // these are null because it doesn't matter what joining a game will do
            hand_size: null,
            lobby: joinlobby.current.value
        });
    };

    return (
        <div className="configure_forms">
            <h3>Create a game:</h3>
            <form className="create_form" onSubmit={handleCreateGame}>
                <div className="login_input">
                    <label>Number of players: </label>
                    <input ref={num_players} className="button_radio" type="radio" name="num_players" value="2" id="numplayers_2" onChange={updateNumPlayers} required/>
                    <label className="label_radio" htmlFor="numplayers_2">2 </label>
                    <input className="button_radio" type="radio" name="num_players" value="3" id="numplayers_3" onChange={updateNumPlayers} />
                    <label className="label_radio" htmlFor="numplayers_3">3 </label>
                    <input className="button_radio" type="radio" name="num_players" value="4" id="numplayers_4" onChange={updateNumPlayers} />
                    <label className="label_radio" htmlFor="numplayers_4">4 </label>
                    {/* <select name="numplayers" id="numplayers_dropdown">
                        
                        You should either switch to dropdowns
                        fix radio buttons
                        of get a 3rd party library
                        
                    </select> */}
                </div>
                <div className="login_input">
                    <label>Starting Hand Size: </label>
                    <input ref={hand_size} className="button_radio" type="radio" name="handsize" value="5" id="handsize_5" onChange={updateHandSize} required/>
                    <label className="label_radio" htmlFor="handsize_5">5 </label>
                    <input className="button_radio" type="radio" name="handsize" value="6" id="handsize_6" onChange={updateHandSize} />
                    <label className="label_radio" htmlFor="handsize_6">6 </label>
                    <input className="button_radio" type="radio" name="handsize" value="7" id="handsize_7" onChange={updateHandSize} />
                    <label className="label_radio" htmlFor="handsize_7">7 </label>
                    <input className="button_radio" type="radio" name="handsize" value="8" id="handsize_8" onChange={updateHandSize} />
                    <label className="label_radio" htmlFor="handsize_8">8 </label>
                    <input className="button_radio" type="radio" name="handsize" value="9" id="handsize_9" onChange={updateHandSize} />
                    <label className="label_radio" htmlFor="handsize_9">9 </label>
                </div>
                <div>
                    <label htmlFor="createlobby_text">Create lobby: </label>
                    <input ref={createlobby} type="text" id="createlobby_text" name="createlobby_text" pattern="^[a-zA-Z0-9]+$" required/>
                </div>
                <button className="button_submit">Create Game</button>
            </form>
            <hr className="create_join_split"/>
            <h3>Join a game:</h3>
            <form className="join_form" onSubmit={handleJoinGame}>
                <div>
                <label htmlFor="joinlobby_text">Create lobby: </label>
                <input ref={joinlobby} type="text" id="joinlobby_text" name="joinlobby_text" pattern="^[a-zA-Z0-9]+$" required/>
                </div>
                <button className="button_submit">Join Game</button>
            </form>
        </div>
    );
}
  
export default App;
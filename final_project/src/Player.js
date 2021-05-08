import axios from 'axios';
import React, { useEffect, useState } from 'react';
import './Player.css';

/**
 *   Props:
 *   - imglink - optional (defaults to meo) 
 *   - orientation - "below" | "side"
 *   - username
 */
function Player (props) {
    // gets a user's theme: 'light' --> unsplash, 'dark' --> cats
    const [link, setLink] = useState("");
    const getLinkFromCatAPI = async () => {
        try {
            const response = await axios({
                url: "https://api.thecatapi.com/v1/images/search",
                method: "get",
                timeout: 3000,
                responseType: "json"
            });
            console.log(response.data[0].url);
            return response.data[0].url;
        } catch {
            console.log("cat server down?!");
        }
    };
    useEffect(() => {
        setTimeout(async() => {
            setLink(await getLinkFromCatAPI());
        }, 1000);
    }, []);

    return (
        <div className="player_profile">
            <img className="avatar" src={link} />
            <div>
                <p className="stats"><strong>{props.player.username}</strong></p>
                <p className="stats">Games Started: {props.player.games_started}</p>
                <p className="stats">Games Won: {props.player.games_won}</p>
            </div>
        </div>
    );
}

export default Player;
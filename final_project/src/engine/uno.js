const getRandomInt = (min, max) => { // all inclusive
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

const mod = (a, n) => ((a % n ) + n ) % n;

export class UnoGame {
    constructor (n_players = 2, hand_size = 7) {
        this.n_players = parseInt(n_players, 10);
        this.player_hands = [];
        this.top_card = this.newCard();
        while (this.top_card.color == "black") { // make sure not a black card
            this.top_card = this.newCard();
        }

        for (let i = 0; i < n_players; i++) {
            this.player_hands.push(this.newHand(hand_size));
        }

        this.isForward = true; // determine flow direction
        this.current_pid = 0; // current player
        this.current_hasDrawn = false;

        // listeners
        this.win_listeners = [];
    }

    getGameState() {
        return {
            players: this.n_players,
            hands: this.player_hands,
            top: this.top_card,
            current_player: this.current_pid,
            has_drawn: this.current_hasDrawn,
            is_forward: this.isForward
        }
    }

    loadGameState(state) {
        this.n_players = state.players;
        this.player_hands = state.hands;
        this.top_card = state.top;
        this.current_pid = state.current_player;
        this.current_hasDrawn = state.has_drawn;
        this.isForward = state.is_forward;
    }

    newCard() {
        if (Math.random() < .04) { // make a black card
            return {
                color: "black",
                value: (getRandomInt(0,1) == 0 ? "wild" : "+4" )
            }
        }

        let value;
        const random = getRandomInt(0,12);
        switch (random) {
            case 10:
                value = "+2";
                break;
            case 11: 
                value = "skip";
                break;
            case 12:
                value = "reverse";
                break;
            default:
                value = random.toString();
        }

        let color;
        switch (getRandomInt(1,4)) {
            case 1:
                color = "red";
                break;
            case 2:
                color = "green";
                break;
            case 3:
                color = "yellow";
                break;
            case 4:
                color = "blue";
                break;
        }

        return {color, value};
    }

    newHand(numCards) {
        return Array(numCards).fill(null).map(() => this.newCard());
    }

    getCurrentHand() {
        return this.player_hands[this.current_player];
    }

    whoNext() {
        return this.isForward ? mod(this.current_pid+1, this.n_players) : mod(this.current_pid-1, this.n_players);
    }

    nextPlayer() {
        this.current_hasDrawn = false;
        this.current_pid = this.whoNext();
        return this.current_pid;
    }

    /**
     * Simple checker if asker's pid is the same as the current pid.
     * Main purpose is to let client have more adaptive error handling.
     * @param {Number} as - the player trying to do something
     */
    isMyTurn(as) {
        return as === this.current_pid;
    }

    /**
     * Will add a card to current player's deck and flagged that
     * the current player has drawn a card.
     * @param {Number} as - the player trying to draw (leaving it blank will skip check)
     * @returns the new card drawn
     */
    draw(as = this.current_pid) {
        if (as == this.current_pid) {
            this.player_hands[this.current_pid].push(this.newCard());
            this.current_hasDrawn = true;
            return this.player_hands[this.current_pid][this.player_hands.length - 1];
        } else {
            return false; // cannot be drawn
        }
    }

    /**
     * tries to place the card described by checking the current player's deck
     * for the card
     * @param {Card} card - card to place on top
     * @param {string} new_color - color to switch, necessary for wild cards
     * @param {Number} as - the player trying to place (leaving it blank will skip check)
     * @returns (false) if card is not found or cannot be placed
     * @returns (true) if card is successfully placed and removed from deck
     */
    try(card, new_color, as = this.current_pid) {
        if (as != this.current_pid || ! this.player_hands[this.current_pid].some((c) => card.color == c.color && card.value == c.value)) {
            return false; // card does not exist in current hand
        }                 // or as doesn't match

        let result = this.placeCard(card, new_color);
        return result // card cannot be placed
        
    }

    /**
     * Attempts to skip current player
     * @param {Number} as - the player trying to draw (leaving it blank will skip check)
     * @returns (true) - player has successfully skipped
     * @returns (false) - player cannot skip as they haven't drawn yet
     */
    skip(as = this.current_pid) {
        if (this.current_hasDrawn && as == this.current_pid) {
            this.nextPlayer();
            return true;
        }
        return false; // cannot skip!
    }

    /**
     * @param {Number} pid - the current player 
     * @param {Card} new_card - the card the current player wants to place
     * @param {String} new_color - the new color the current player wants to change to (required for black cards)
     * @returns (false) - if card does not exist, (true) - if card exists and was removed
     */
    placeCard(new_card, new_color) { // returns true if able to be placed
        // any card placed will be for current player

        // wild/black card scenario
        if (new_card.color == "black") {
            this.top_card = {color: new_color, value: "-1"}; // change color
            this.removeCard(new_card);
            if (new_card.value == "+4") {
                this.addCards(4);
                this.nextPlayer(); // +4 has to skip too
            }
            this.nextPlayer();
            return true;
        }
        
        // check if card will fit
        if (new_card.color == this.top_card.color || new_card.value == this.top_card.value) {
            // +2 or skip or reverse checks
            this.removeCard(new_card);
            switch (new_card.value) {
                case "+2":
                    this.addCards(2);
                    this.nextPlayer(); // +2 has to skip too
                    break;
                case "reverse":
                    this.isForward = !this.isForward;
                    break;
                case "skip":
                    this.nextPlayer(); // calls an extra time
                    break;
            }
            this.nextPlayer();

            this.top_card = new_card;
            return true;

        }

        return false; // card cannot be placed
    }

    removeCard(card) {
        let cardId = this.player_hands[this.current_pid].findIndex((c) => (c.color == card.color && c.value == card.value));
        if (cardId == -1) {
            return null; // card does not exist
        }
        return this.player_hands[this.current_pid].splice(cardId, 1)[0];
    }

    addCards(nCards) { // adds cards to next user
        const next = this.whoNext();
        for (let i = 0; i < nCards; i++) {
            this.player_hands[next].push(this.newCard());
        }
        return;
    }

    checkWin() {
        // a little in-efficient but it should work
        const winning_pid = this.player_hands.findIndex((hand) => hand.length == 0);
        if (winning_pid == -1) {
            return; // no one won
        } else {
            this.alertWin(winning_pid);
        }
    }

    alertWin(winning_pid) {
        this.win_listeners.forEach((listener) => listener(winning_pid));
    }

    /**
     * 
     * @param {Function} listener - the listener must accept a winning_pid
     */
    addWinListener(listener) {
        this.win_listeners.push(listener);
    }
}


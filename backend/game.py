import db
import json
import bottle
from bottle import response, request
from user import User
import time

class Game:
    def __init__(self, gid, uuid, lobby, text):
        self.gid = gid
        self.uuid = uuid
        self.lobby = lobby
        self.text = text

    @staticmethod
    def getLatestGid(lobby):
        with db.connect() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT * FROM Game
                WHERE lobby = ?
                ORDER BY madeAt DESC
            ''', (lobby, ))
            row = cursor.fetchone()
        return row['gid']

    @staticmethod
    def createGame(lobby, data, numplayers):
        with db.connect() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO Game (lobby, data, numplayers, madeAt)
                VALUES (?, ?, ?, ?)
            ''', (lobby, data, numplayers, int(time.time()) ))
            conn.commit()
            gid = cursor.lastrowid
        return gid

    @staticmethod 
    def addPlayer(token, gid, asplayer): # will throw error if asplayer slot is taken
        uuid = User.getUUIDofSession(token)   # due to key constraints
        with db.connect() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO InGame (uuid, gid, asplayer)
                VALUES (?, ?, ?)
            ''', (uuid, gid, asplayer))
            conn.commit()
        return

    @staticmethod
    def getAllPlayers(gid):
        uuids = []
        usernames = []
        games_starteds = []
        games_wons = []
        asplayers = []
        with db.connect() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT * FROM InGame
                WHERE gid = ?
            ''', (gid, ))
            rows = cursor.fetchall()
            for row in rows:
                uuids.append(row['uuid'])
                asplayers.append(row['asplayer'])

            for uuid in uuids:
                cursor.execute('''
                    SELECT username, games_started, games_won FROM User
                    WHERE uuid = ?
                ''', (uuid, ))
                r = cursor.fetchone()
                usernames.append(r['username'])
                games_starteds.append(r['games_started'])
                games_wons.append(r['games_won'])

        return [{
            'username': username,
            'games_started': games_started,
            'games_won': games_won,
            'asplayer': asplayer
        } for username, games_started, games_won, asplayer in zip(usernames, games_starteds, games_wons, asplayers)]
                


    @staticmethod
    def getGame(gid): # returns raw string
        with db.connect() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT * FROM Game
                WHERE gid = ?
            ''', (gid, ))
            row = cursor.fetchone()
        return row['data']

    @staticmethod
    def setGame(gid, data): # returns raw string
        with db.connect() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                UPDATE Game
                SET data = ?
                WHERE gid = ?
            ''', (data, gid))
            conn.commit()
        return Game.getGame(gid)


    @staticmethod
    def setupBottleRoutes(app):

        ''' making a game requires a JSON of this form:
            {
                creator: <string - token>
                lobby: <string - generated name / game sesh>, 
                data: <string - gameState JSON>,
                numplayers: <integer>
            }
        '''
        @app.route('/game/create', method=['OPTIONS', 'POST'])
        def makeNewGame(): # should also reset the lobby
            try:
                creator = request.json['creator']
                lobby = request.json['lobby'] # maybe add check validity of lobby
                data = request.json['data']
                numplayers = request.json['numplayers']
            except Exception:
                response.status = 400
                return "Invalid request body, needs: creator's token, lobby, data, and numplayers."

            # make game
            gid = Game.createGame(lobby, data, numplayers)
            User.incrementStarted(creator)
            Game.addPlayer(creator, gid, 0)
            return json.dumps(True)

        ''' adding a player to a game requires:
            {
                token: <string>,
                asplayer: <integer>
            }
            this'll return:
            {
                data: <gameState JSON>,
            }
        '''
        @app.route('/game/<lobby>', method=['OPTIONS', 'POST'])
        def addPlayerToGame(lobby): #TODO definitely fixed this so that it won't add player if the user is already in the game
            try:                    # just make a find asplayer route
                token = request.json['token']
                asplayer = request.json['asplayer']
            except Exception:
                response.status = 400
                return "Invalid request body, needs: token and asplayer."

            try:
                gid = Game.getLatestGid(lobby)
            except Exception:
                response.status = 404
                return "Lobby and game has not been made."
            
            try: 
                Game.addPlayer(token, gid, asplayer)
                gamestate = Game.getGame(gid)
                pythonGamestate = json.loads(gamestate)

            except Exception:
                response.status = 409
                return f"Player slot {asplayer} for {lobby} is already taken. Or token does not exist."
            return json.dumps({'data': pythonGamestate}) 

        ''' changing the gamestate requires:
            {
                data: <string - gameState JSON>
            }
        '''
        @app.route('/game/<lobby>', method=['OPTIONS', 'PUT'])
        def updateGameState(lobby):
            try:
                gid = Game.getLatestGid(lobby)
            except Exception:
                response.status = 404
                return "Lobby and game has not been made."
            
            try:
                data = request.json['data']
            except Exception:
                response.status = 400
                return "Invalid request body, needs: data - a stringify-ied version of game state."

            olddata = Game.getGame(gid)
            try:
                newdata = Game.setGame(gid, data)
                pythonNewdata = json.loads(newdata)
            except Exception:
                Game.setGame(gid, olddata)
                response.status = 409
                return "The uploaded game state is invalid JSON."
            return json.dumps(pythonNewdata)

        
        @app.get('/game/<lobby>')
        def getGameState(lobby):
            try:
                gid = Game.getLatestGid(lobby)
            except Exception:
                response.status = 404
                return "Lobby and game has not been made."

            try:
                gamestate = Game.getGame(gid) 
                pythonGamestate = json.loads(gamestate)
            except Exception:
                response.status = 409
                return "The last uploaded game state is invalid JSON."
            return json.dumps(pythonGamestate) # we translate from SQL text --> Python dict --> JSON

        ''' returns a JSON of:
            [{
                username: <string>,
                games_started: <integer>,
                games_won: <integer>,
                asplayer: <integer>
            }, ...]
        '''
        @app.get('/game/players/<lobby>')
        def getAllGamePlayers(lobby):
            try:
                gid = Game.getLatestGid(lobby)
            except Exception:
                response.status = 404
                return "Lobby and game has not been made."

            return json.dumps(Game.getAllPlayers(gid))
            


        
        # should probably add some functions to GET all the users on a specific game




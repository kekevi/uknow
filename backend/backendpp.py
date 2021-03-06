
# A very simple Bottle Hello World app for you to get started with...
import bottle
import sqlite3
from bottle import Bottle, run, response, request, default_app, route
import json
import time
import secrets
from hashlib import sha256

class EnableCors(object):
    name = 'enable_cors'
    api = 2
    def apply(self, fn, context):
        def _enable_cors(*args, **kwargs):
            # set CORS headers
            response.headers['Access-Control-Allow-Origin'] = '*'   # I've heard you're supposed to change this if you put this on an actual server
            response.headers['Access-Control-Allow-Methods'] = 'PUT, GET, POST, DELETE, OPTIONS'
            response.headers['Access-Control-Allow-Headers'] = 'Origin, Accept, Content-Type, X-Requested-With, X-CSRF-Token, SessionToken'

            if bottle.request.method != 'OPTIONS':
                # actual request; reply with the actual response
                return fn(*args, **kwargs)

        return _enable_cors

def connect():
    conn = sqlite3.connect('user.db')
    conn.row_factory = sqlite3.Row
    return conn
    
with connect() as db:
        # note that hashedpassword should really be a BigInteger
        db.execute("DROP TABLE IF EXISTS User")
        db.execute("""
            CREATE TABLE User (
                uuid INTEGER PRIMARY KEY,
                username TEXT UNIQUE,
                hashedpassword TEXT,
                theme TEXT,
                games_started INTEGER,
                games_won INTEGER
            )
        """)

with connect() as db:
    db.execute("DROP TABLE IF EXISTS Session")
    # note: Session.expiration is in seconds since Unix epoch
    db.execute("""
        CREATE TABLE Session (
            sessionid INTEGER PRIMARY KEY,
            uuid INTEGER,
            token TEXT,
            expiration INTEGER, 
            FOREIGN KEY (uuid) REFERENCES User(uuid)
        )
    """)

with connect() as db:
    db.execute("DROP TABLE IF EXISTS Game") # data holds the JSON for the game object
    db.execute("""
        CREATE TABLE Game (
            gid INTEGER PRIMARY KEY,
            lobby TEXT,
            data TEXT,
            numplayers INTEGER,
            madeAt TIMESTAMP
        )
    """)

with connect() as db:
    db.execute("DROP TABLE IF EXISTS InGame")
    db.execute("""
        CREATE TABLE InGame (
            uuid INTEGER,
            gid INTEGER,
            asplayer INTEGER,
            PRIMARY KEY (gid, asplayer),
            FOREIGN KEY (uuid) REFERENCES User(uuid),
            FOREIGN KEY (gid) REFERENCES Game(gid)
        )
    """)

with connect() as db:
    db.execute("DROP TABLE IF EXISTS Chat")
    db.execute("""
        CREATE TABLE Chat (
            cid INTEGER PRIMARY KEY,
            time TIMESTAMP,
            message TEXT,
            uuid INTEGER,
            gid INTEGER,
            FOREIGN KEY (uuid) REFERENCES User(uuid),
            FOREIGN KEY (gid) REFERENCES Game(gid)
        )
    """)

with connect() as db:
    hashedpassword = '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8' # sha256("password")
    db.execute('''
        INSERT INTO User (uuid, username, hashedpassword, theme, games_started, games_won)
        VALUES (1, "admin", ?, "light", 10, 2)                
    ''', (hashedpassword, ))

    hashedpassword = '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8' # sha256("password")
    db.execute('''
        INSERT INTO User (uuid, username, hashedpassword, theme, games_started, games_won)
        VALUES (2, "staff", ?, "light", 0, 0)                
    ''', (hashedpassword, ))

    db.commit()
    
DEFAULT_THEME = "light"

## ORM for User authorization and data retrieval. 

class User: 
    def __init__(self, uuid, username, hashedpassword, theme):
        self.uuid = uuid
        self.username = username
        self.hashedpassword = hashedpassword
        self.theme = theme

    # ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    # look up methods
    # ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

    @staticmethod
    def lookupUUID(username):
        with connect() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT uuid
                FROM User
                WHERE username = ?
            ''', (username, ))
            row = cursor.fetchone()
            uuid = row['uuid']
        
        if uuid is None:
            raise Exception(f"No such user with username {username}")
        else:
            return uuid

    @staticmethod
    def getUUIDofSession(token):
        with connect() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT *
                FROM Session
                WHERE token = ?
            ''', (token, ))
            row = cursor.fetchone()
        if row is None:
            return False # session does not exist
        if row['expiration'] < int(time.time()):
            return False # session has expired
        return row['uuid']
        
    @staticmethod
    def getTheme(token):
        uuid = User.getUUIDofSession(token)
        if uuid == False:
            raise Exception("Invalid session.")
        
        with connect() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT theme
                FROM User
                WHERE uuid = ?
            ''', (uuid, ))
            row = cursor.fetchone()
        
        return row['theme']


    # ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    # edit methods
    # ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

    @staticmethod
    def createUser(username, hashedpassword):    
        with connect() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO User (username, hashedpassword, theme)
                VALUES (?, ?, ?)
            ''', (username, hashedpassword, DEFAULT_THEME))
            conn.commit()
        return 

    @staticmethod
    def getAuthentication(username, hashedpassword):
        # check if username, hashedpassword matches
            # if so, create a random token with the session
            # else, raise exception of incorrect password
        with connect() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT * 
                FROM User 
                WHERE username = ? AND hashedpassword = ?
            ''', (username, hashedpassword))
            row = cursor.fetchone()
        if row is None:
            raise Exception(f"No user {username} exists.")
        uuid = row['uuid']
        token = secrets.token_hex()
        expiration = int(time.time()) + 8*60*60 # python unix is in seconds
        with connect() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO Session (uuid, token, expiration)
                VALUES (?, ?, ?)
            ''', (uuid, token, expiration))
            conn.commit()
        return (token, expiration)

    @staticmethod
    def removeAuthentication(token): # only signs out of one session, not all
        uuid = User.getUUIDofSession(token)
        if uuid == False:
            raise Exception("Invalid session.")
        
        with connect() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                DELETE FROM Session
                WHERE uuid = ? AND token = ?
            ''', (uuid, token))
            conn.commit()
        return

    @staticmethod
    def changeTheme(token, theme):
        uuid = User.getUUIDofSession(token)
        if uuid == False:
            raise Exception("Invalid session.")
        
        with connect() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                UPDATE User
                SET theme = ?
                WHERE uuid = ?
            ''', (theme, uuid))
            conn.commit()
        return

    @staticmethod
    def incrementStarted(token): # should not be public as API
        uuid = User.getUUIDofSession(token)
        with connect() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                UPDATE User
                SET games_started = games_started + 1
                WHERE uuid = ?
            ''', (uuid, ))
            conn.commit()
        return
    
class Game:
    def __init__(self, gid, uuid, lobby, text):
        self.gid = gid
        self.uuid = uuid
        self.lobby = lobby
        self.text = text

    @staticmethod
    def getLatestGid(lobby):
        with connect() as conn:
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
        with connect() as conn:
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
        with connect() as conn:
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
        with connect() as conn:
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
        with connect() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT * FROM Game
                WHERE gid = ?
            ''', (gid, ))
            row = cursor.fetchone()
        return row['data']

    @staticmethod
    def setGame(gid, data): # returns raw string
        with connect() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                UPDATE Game
                SET data = ?
                WHERE gid = ?
            ''', (data, gid))
            conn.commit()
        return Game.getGame(gid)
        

@route('/login', method=['OPTIONS', 'POST'])
def login():
    # try to hash on client, if so, use 
    try:
        username = request.json['username']
        hashedpassword = sha256(request.json['password'].encode('utf-8')).hexdigest()
        tokenAndExp = User.getAuthentication(username, hashedpassword)
    except Exception:
        response.status = 401   
        return "User either doesn't exist or the password is wrong."

    token = tokenAndExp[0]
    exp = tokenAndExp[1]
    
    return json.dumps({'token': token, 'expiration': exp}) # we will not be using actual JWT tokens, just session tokens

@route('/logout', method=['DELETE'])
def logout():
    try:
        token = request.headers.get('SessionToken')
    except Exception:
        response.status = 401
        return "Ensure that SessionToken header is filled."

    try:
        User.removeAuthentication(token)
    except Exception:
        response.status = 401
        return "Session invalid."
    
    return json.dumps(True)

@route('/signup', method=['OPTIONS', 'POST']) # will login too
def signup():
    try:
        username = request.json['username']
        password = request.json['password'] # input check password validity here
    except Exception:
        response.status = 401
        return "Ensure username and password are valid and in JSON: {'username': <username>, 'password': <password>}"

    hashedpassword = sha256(password.encode('utf-8')).hexdigest()
    try:
        User.createUser(username, hashedpassword)
        token, exp = User.getAuthentication(username, hashedpassword)
    except Exception:
        response.status = 409
        return "Username already exists!"
    return json.dumps({'token': token, 'expiration': exp})

@route('/user/theme', method=['GET'])
def getUserTheme():
    try:
        token = request.headers.get('SessionToken')
    except Exception:
        response.status = 401
        return "Ensure that SessionToken header is filled."

    try:
        theme = User.getTheme(token)
    except Exception:
        response.status = 401
        return "Invalid session token."
    
    return json.dumps({'theme': theme})

@route('/user/theme', method=['OPTIONS', 'PUT'])
def setUserTheme():
    try:
        token = request.headers.get('SessionToken')
    except Exception:
        response.status = 401
        return "Ensure that SessionToken header is filled."

    try:
        theme = str(request.json['theme'])
    except Exception:
        response.status = 400
        return "Ensure theme is sent in JSON: {'theme': <theme>}"

    try:
        User.changeTheme(token, theme)
        themeGot = User.getTheme(token)
    except Exception:
        response.status = 401
        return "Invalid session token."
    
    return json.dumps({'theme': themeGot})
    
    
    
''' making a game requires a JSON of this form:
    {
        creator: <string - token>
        lobby: <string - generated name / game sesh>, 
        data: <string - gameState JSON>,
        numplayers: <integer>
    }
'''
@route('/game/create', method=['OPTIONS', 'POST'])
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
@route('/game/<lobby>', method=['OPTIONS', 'POST'])
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
@route('/game/<lobby>', method=['OPTIONS', 'PUT'])
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


@route('/game/<lobby>', method=['GET'])
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
@route('/game/players/<lobby>', method=['GET'])
def getAllGamePlayers(lobby):
    try:
        gid = Game.getLatestGid(lobby)
    except Exception:
        response.status = 404
        return "Lobby and game has not been made."

    return json.dumps(Game.getAllPlayers(gid))
    
application = default_app()
application.install(EnableCors())

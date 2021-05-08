import db
import json
import bottle
from bottle import response, request
from hashlib import sha256
import secrets
import time

DEFAULT_THEME = "white"
EMPTY_DAY_DATA = '''[{"type":"paragraph","children":[{"text":""}]}]'''

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
        with db.connect() as conn:
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
        with db.connect() as conn:
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
    def fetchDayData(token, year, month, day):
        uuid = User.getUUIDofSession(token)
        if uuid == False:
            raise Exception("Invalid session.")

        sqldate = f"{year}-{month}-{day}"
        with db.connect() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT data
                FROM UserData
                WHERE uuid = ? AND date = ?
            ''', (uuid, sqldate))
            row = cursor.fetchone()
            # what if data doesn't exist???
            if row is None:
                User.initializeDayData(uuid, year, month, day)
                return EMPTY_DAY_DATA
            else:
                return row['data']

    # fetchWeek - returns a list of UserData objects {date, data}
    # params: credentials, any day of a particular week
    @staticmethod
    def fetchWeek():
        # Step 1: calculate all the days 
        # Step 2: call fetchDay on all these days
        # Step 3: return a collection of these fetchDay objects
        return None
        
    @staticmethod
    def getTheme(token):
        uuid = User.getUUIDofSession(token)
        if uuid == False:
            raise Exception("Invalid session.")
        
        with db.connect() as conn:
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
        with db.connect() as conn:
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
        with db.connect() as conn:
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
        with db.connect() as conn:
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
        
        with db.connect() as conn:
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
        
        with db.connect() as conn:
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
        with db.connect() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                UPDATE User
                SET games_started = games_started + 1
                WHERE uuid = ?
            ''', (uuid, ))
            conn.commit()
        return

    #
    # Bottle Routes
    #

    @staticmethod
    def setupBottleRoutes(app):
        #@app.post('/login')
        @app.route('/login', method=['OPTIONS', 'POST'])
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

        @app.delete('/logout')
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

        @app.route('/signup', method=['OPTIONS', 'POST']) # will login too
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

        @app.get('/user/theme')
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

        @app.route('/user/theme', method=['OPTIONS', 'PUT'])
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
            
       # still need to add increment user's started and wins count

        
       

            

            

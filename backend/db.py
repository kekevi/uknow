import sqlite3

# defining model week :
sunday = '''{
      "date": new Date("April 25, 2021"),
      "month": "April",
      "number": 25,
      "of_week": "Sunday",
      "notes": [
        {
          "type": "paragraph",
          "children": [
            {
              "text": "Today is "
            },
            {
              "text": "Sunday",
              "bold": true
            },
            {
              "text": "."
            }
          ]
        }
      ],
    }
'''

EMPTY_DAY_DATA = '''{"data":new Date()
'''

def connect():
    conn = sqlite3.connect('uno.db')
    conn.row_factory = sqlite3.Row
    return conn

def resetDB():

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

if __name__ == "__main__":
    print("Resetting database")
    resetDB()



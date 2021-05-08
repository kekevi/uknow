import bottle # i added this, not sure if you need to
from bottle import Bottle, run, response, request
import json
import db
from user import User
from game import Game

app = Bottle()

# from "ron rothman" @ https://stackoverflow.com/questions/17262170/bottle-py-enabling-cors-for-jquery-ajax-requests
class EnableCors(object):
    name = 'enable_cors'
    api = 2

    def apply(self, fn, context):
        def _enable_cors(*args, **kwargs):
            # set CORS headers
            response.headers['Access-Control-Allow-Origin'] = '*'
            response.headers['Access-Control-Allow-Methods'] = 'POST, PUT, OPTIONS' # --- idk why I have to comment this out
            response.headers['Access-Control-Allow-Headers'] = 'Origin, Accept, Content-Type, X-Requested-With, X-CSRF-Token'

            if bottle.request.method != 'OPTIONS':
                # actual request; reply with the actual response
                return fn(*args, **kwargs)

        return _enable_cors

User.setupBottleRoutes(app)
Game.setupBottleRoutes(app)

app.install(EnableCors())

# Start the backend
run(app, host='localhost', port=3001, debug=True)

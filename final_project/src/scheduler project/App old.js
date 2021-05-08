import logo from './resources/bulletnoteslogo.png';
import './App.css';
import React, {useCallback, useEffect, useMemo, useState} from 'react'
import {Inject, ScheduleComponent, Day, Week, WorkWeek, Month, Agenda} from '@syncfusion/ej2-react-schedule'
import SlateEditor from './SlateEditor.js';
import Weekbar from './Weekbar.js';
import DaySchedule from './DaySchedule.js';
import weekofApril25 from './modelWeek.js';
import axios from 'axios';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';

const DOMAIN_NAME = "http://localhost:3001";
const HTTP_TIMEOUT = 3000
const CORS_SITE = "http://localhost"

function App() {
  // we define a model Week object:
  const modelWeek = weekofApril25;

  // temporary force selection on Monday:
  let monday = new Date("April 26, 2021");
  let mondayEvents = [
    {
      title: "Untitled",
      beginHour: 9,         // REMEMBER TO PARSE AS STRINGS!!!
      beginMinute: 0,
      endHour: 13,
      endMinute: 0,
      description: "This is the stuff.",
      category: {
        color: "lightblue"
      }
    },
    {
      title: "Third Event Added",
      beginHour: 9,         // REMEMBER TO PARSE AS STRINGS!!!
      beginMinute: 30,
      endHour: 13,
      endMinute: 30,
      description: "Some more stuff.",
      category: {
        color: "lightblue"
      }
    },
    {
      title: "Second Event",
      beginHour: 14,
      beginMinute: 35,
      endHour: 15,
      endMinute: 35,
      description: "This is some other stuff.",
      category: {
        color: "gray"
      }
    }
  ]

  const [session, setSession] = useState({
    token: "token on refresh",
    expiration: 1 // in seconds
  })

  const handleTokenRetrieval = (retrieved) => {
    setSession(retrieved);
  }

  if (session.expiration < Date.now() / 1000) { // is expired
    return <LoginPage onToken={handleTokenRetrieval}/>
  }



  return (
    <div className="App">
      <section className="topbar">
        <Calendar />
        <Weekbar week={modelWeek} />
      </section>
      <section className="main" >
        <div className="slate scrollbar">
          <SlateEditor />
        </div>
        <div className="dayschedule scrollbar">
          <DaySchedule 
            date={monday}
            hourSpan={50}
            width={200}
            listEvents={mondayEvents}
          />
        </div>
      </section>
    </div>
  );
}

function LoginPage (props) {
  return (
    <div className="App login">
      <div className="center">
        <img className="logo" src={logo} height={50}/>
        <p className="login_desc">
          A note taking app with an automatic scheduler and cloud saves. Designed for UNC's COMP 426 Final Project by Kevin Chen (kekevi).
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

function LoginForm (props) {
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

export default App;

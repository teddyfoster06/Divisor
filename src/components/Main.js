import React, {useEffect, useState, useRef} from 'react'
import {useNavigate} from 'react-router-dom'
import './Main.css'
import Topbar from './Topbar.js'
import Cookies from "js-cookie"
import socketIOClient from 'socket.io-client';
const endpoint = "https://x3i2jubzjv.us-east-1.awsapprunner.com";

//setContent("buttons")
//setMessage("↓Enter Username↓")

function Main() {
  const [content, setContent] =  useState("buttons");
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState("loaded")
  const [username, setUsername] = useState("");
  const [socket, setSocket] = useState(null)
  const [message, setMessage] = useState("↓Enter Username↓")
  const inputRef = useRef("");
  const [recentSessions, setRecentSessions] = useState(["Loading..."]);

  const navigate = useNavigate();
  useEffect(() => {
    const socket1 = socketIOClient(endpoint);
    console.log("Page Mounted")
    setSocket(socket1)
    if(Cookies.get('recent')){
      const arr = Cookies.get('recent').split(",");
      arr.pop()
      setRecentSessions(arr)
    }else{
      setRecentSessions([])
    }
    socket1.on("message", (data) => {
      if(data.value){
        Cookies.set("username", data.user);
        console.log("Input Value is " + inputRef.current);
        Cookies.set("code", inputRef.current)
        const currentValue = Cookies.get('recent') || ''
        const newValue = inputRef.current + "," + currentValue
        Cookies.set("recent", newValue)
        navigate("/editor")
      }
    })
  }, [])
  useEffect(() => {
    console.log(inputValue);
  }, [inputValue])
  const handleInputChange = (event) => {
    const filteredValue = event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    setInputValue(filteredValue);
    inputRef.current = filteredValue
  };
  const handleUsernameChange = (event) => {
    setUsername(event.target.value)
  }
  return (
    <div style={{ height: '100%', width: '100%' }}>
      <Topbar />
      <div className='all1'>
        <div style={{ backgroundImage: 'radial-gradient(at 100% 0, #5adaff, #5468ff 100%)', minHeight: '100%', boxShadow: '0 4px 8px inset rgba(45, 35, 66, 0.3)', width: "20%"}}>
          <div className='sbstack'>
            <div className='sbText'>
              Recent Sessions
              <div style={{height: "10px"}}/>
              <div style={{height: "45vh", overflow: "scroll"}}>
                {recentSessions.map((item) => (
                  <div>
                      ●{item}
                  </div>
                ))}
              </div>
              <div style={{position: "absolute", bottom: "1vh", width: "18%"}}>
              <div className='credits-style'>
                Built By Teddy Foster, Gideon Dayo, and Jorge Tecedor
              </div>
              <div className='credits-style'>
                ©2025 CodeRed
              </div>
              </div>
              
              
            </div>
            {/* <div className='sbText'>
              Current Sessions
            </div> */}
          </div>
          {/* <div className='credit'>
          <a href="https://www.youtube.com/watch?v=dQw4w9WgXcQ" class="credits">Credits</a>

          </div> */}
        </div>
        <div style={{ background: 'white', minHeight: '100%', flexGrow: '6', width: "80%"}}>
          <div className='welcome'>
            {content === "buttons" ? "Welcome Back!" : message}
          </div>
          <div className='stack'>
            {content === "buttons" ? (<button className='button' onClick={() => {setContent("join")}}>Play Session</button>) : (<div className='roomInputs'><div className='full-width'><input type='text' className='code-form' onChange={handleUsernameChange} value={username} ></input></div>
              <div className='welcome full-width'>↓Enter Room Code↓</div>
              <input type='text' className='code-form' onChange={handleInputChange} value={inputValue} ></input></div>
              
          )}
            <button className='button' 
            onClick={() => {
              if(content === "buttons"){
                setContent("create")
              }else{
                console.log(document.cookie)
                setLoading("loading")

                if(socket !== null){
                  console.log("Socket is not null");
                  socket.emit('canJoin', {username: username})
                }
              }
            }}
            >{loading === "loaded" ? (content === "buttons" ? "Create Session" : (content === "join" ? "Join Session!" :"Create Session!")) : "Loading..."}</button>
            
            {content !== "buttons" ? (<button className="button1" 
            onClick={() => {
              setContent("buttons");
              setMessage("↓Enter Username↓");
            }}
              >Back
            </button>) : (<div/>)}

            {/* <button className='button'>Search for League</button> */}
          </div>
        </div>
      </div>
    </div>
  )
}


export default Main
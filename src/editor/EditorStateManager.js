import React, {useState, useEffect, useRef} from 'react'
import Icon from '../components/Icon';

import './EditorStateManager.css'
import socketIOClient from 'socket.io-client';

import 'codemirror/lib/codemirror.css';
import 'codemirror/mode/xml/xml';
import 'codemirror/mode/clike/clike';
import 'codemirror/mode/python/python';
import 'codemirror/addon/edit/closebrackets'

import PocketBase from 'pocketbase';
import { Controlled as ControlledEditor} from 'react-codemirror2';
import { Language } from '@mui/icons-material';

const databaseEndpoint = 'http://127.0.0.1:8090';
const database = new PocketBase(databaseEndpoint);



const endpoint = "https://x3i2jubzjv.us-east-1.awsapprunner.com";

function EditorStateManager({caseSetter, runnerFunction, problemsSetter, loadingSetter1, addLine, setSocket, sessionID, user, currentLanguage}) {
    const languageRef = useRef(currentLanguage);
    useEffect(() => { 
        languageRef.current = currentLanguage;
        console.log("From Editor:");
        console.log(currentLanguage);
    }, [currentLanguage]);


    const runCode = (probNum, mess) => {
        console.log("Run Called");
        console.log(languageRef.current);
        console.log(sessionID);
        if(languageRef.current === 'text/x-java'){
            //Java
            outerSocket.current.emit(mess, {id: sessionID, language: 'java', value: valueRef.current, number: probNum});
        }else if(languageRef.current === 'text/x-python'){
            //Python
            outerSocket.current.emit(mess, {id: sessionID, language: 'python', value: valueRef.current, number: probNum});
        }else{
            //C++
            outerSocket.current.emit(mess, {id: sessionID, language: 'cpp', value: valueRef.current, number: probNum});
        }
    }

    useEffect(()=>{
        console.log(currentLanguage);
    }, [currentLanguage])
    
    const valueRef = useRef("@Not_Updated");
    const [value, setValue2] = useState(valueRef.current);

    const [problems, setProblems] = useState([])

    const outerSocket = useRef(null);
    const outerEditor = useRef();

    // const topStyle = useRef({opacity: "50%", position: "absolute", height: "2.5vh", width: "10vw", top: "1vh", left: "4vw", backgroundColor: '#d0e6f4'})
    // const middleStyle = useRef({opacity: "40%", position: "absolute", height: "2vh", width: "10vw", top: "10vh", left: "5vw", backgroundColor: '#d0e6f4'})
    // const bottomStyle = useRef({opacity: "25%", position: "absolute", height: "2vh", width: "10vw", top: "12vh", left: "5vw", backgroundColor: '#d0e6f4'})


    const cursorLine = useRef(0)
    const cursorCharacter = useRef(0)
    const editNumber = useRef(0);
    const lastMyChange = useRef(undefined);
    const myChangesRecieved = useRef(0);

    const preventCursor = useRef(false);

    const mouseIsDown = useRef(false);
    const recordNext = useRef(false);
    const fromLoc = useRef({line: 0, ch: 0});
    const toLoc = useRef({line: 0, ch: 0});

    const lastOtherChange = useRef({username: "initial", number: undefined});
    
    const changes = useRef([]); 
    
    const count = useRef(0);

    const handleKeyDown = (editor, event) => {
        count.current = 0;
    }
    const handleCursorActivity = (editor) => {
        if(preventCursor.current){
            setCursor(cursorLine.current, cursorCharacter.current);
            preventCursor.current = false;
        }else{
            
            const cursor = editor.getCursor();
            setCursor(cursor.line, cursor.ch);
            if(recordNext.current){
                fromLoc.current = {line: cursor.line, ch: cursor.ch};
                toLoc.current = {line: cursor.line, ch: cursor.ch};
                recordNext.current = false;
            }
            if(mouseIsDown.current){
                console.log("Mouse is down");
                if(lineToChar(valueRef.current, cursor.line, cursor.ch) < lineToChar(valueRef.current, fromLoc.current.line, fromLoc.current.ch)){
                    fromLoc.current = {line: cursor.line, ch: cursor.ch};
                }else if(lineToChar(valueRef.current, cursor.line, cursor.ch) > lineToChar(valueRef.current, fromLoc.current.line, fromLoc.current.ch)){
                    toLoc.current = {line: cursor.line, ch: cursor.ch};
                }
                
                if(!(toLoc.current.line === fromLoc.current.line && toLoc.current.ch === fromLoc.current.ch)){
                    highlightRange(fromLoc.current, toLoc.current);
                }else{
                    clearHighlights();
                }
            }
            // console.log(`Current highlight is from ${JSON.stringify(fromLoc.current)} and to ${JSON.stringify(toLoc.current)}`)
            // console.log(`editor set cursor to ${cursor.line} ${cursor.ch}`)
            // cursorCharacter.current = cursor.ch;
            // cursorLine.current = cursor.line;
        }

    }

    const handleMouseDown = () => {
        // console.log("mouse down function");
        mouseIsDown.current = true;
        recordNext.current = true;
        clearHighlights();
    }

    const handleMouseUp = () => {
        mouseIsDown.current = false;
    }

    function highlightRange (startPos, endPos){

        
        clearHighlights();

        outerEditor.current.getDoc().markText(
            startPos, endPos, {className: 'highlighted-text'}
        )
    }
    function clearHighlights(){
        // console.log("Clear highlights called");
        outerEditor.current.getDoc().getAllMarks().forEach(marks => {
            marks.clear();
        })
    }


    function setValue(value2){
        valueRef.current = value2;
        setValue2(value2);
    }
    
    function setCursor(line, char){
        // console.log(`Old cursor location ln: ${cursorLine.current}, char: ${cursorCharacter.current}`)
        outerEditor.current.setCursor(line, char);
        cursorLine.current = line;
        cursorCharacter.current = char;
        // console.log(`New cursor location ln: ${cursorLine.current}, char: ${cursorCharacter.current}`)
    }

    // function runCode ()  {
    //     console.trace();
    //     if(temporaryRunCount.current > 1){
            
    //     }
        
    // }




    //Run this code whenever the editor recieves an update
    function handleChange(editor, data, valueFromEditor){
        //Log the data from the editor
        console.log("Data:");
        console.log(data);

        const text = data.text;
        const type = data.origin;


        //Check if the type is any form of an addition
        if((type === 'paste' || type === '+input') && count.current === 0){
            count.current++;
            if(!(text.length === 1 && text[0] === "")){
                //Find the location of the character where the edit occurs
                
                let temporary = value;

                const charStart = lineToChar(valueRef.current, data.from.line, data.from.ch)
                const dataString = dataToString(text)
                const addData = handleAddition(valueRef.current, dataString, charStart);

                setValue(addData.newValue);
                setCursor(addData.cursorLine, addData.cursorCharacter);

                
                

                console.log(`Requesting to add \"${dataString}\" to code at ${charStart}`)

                //Props: id, username, change num , change info

                //Send the information about the addition
                // console.log("Sending: ");
                // console.log({id: sessionID, username: user, atChar: charStart, text: addData.inserted, lastChange: lastOtherChange.current, editNumber: editNumber.current})

                temporary = temporary.substring(0, charStart) + `{+${addData.inserted}+}` + temporary.substring(charStart);

                outerSocket.current.emit('add', {extraInfo: temporary, id: sessionID, username: user, atChar: charStart, text: addData.inserted, lastChange: lastOtherChange.current, editNumber: editNumber.current, language: currentLanguage});
                editNumber.current += 1;

                //Do this last
                changes.current.push({type: 'add', atChar: charStart, inserted: addData.inserted});
                // console.log("Increased changes.length to " + changes.current.length);
            }
                
        //Check if the edit is some form of a removal
        }else if(type === 'cut' || type === '+delete'){
            

            let temporary = value;

            //Find the point where the removal starts and ends
            let charStart = lineToChar(valueRef.current, fromLoc.current.line, fromLoc.current.ch)
            let charEnd = lineToChar(valueRef.current, toLoc.current.line, toLoc.current.ch)
            if(charStart === charEnd){
                charStart = lineToChar(valueRef.current, data.from.line, data.from.ch);
                charEnd = lineToChar(valueRef.current, data.to.line, data.to.ch);
            }
            


            if(!(charStart === 0 && charEnd == 0)){
                let flag = false;
                if(charStart === 0 && charEnd === valueRef.current.length){
                    // console.log("Tryong to remoce whole ass thign");
                    charEnd -= 1;
                    flag = true;
                }
                let deleteData = handleRemoval(valueRef.current, charStart, charEnd);
                
                // console.log(valueRef.current.length);
                setValue(deleteData.newValue);
                
                setCursor(deleteData.cursorLine, deleteData.cursorCharacter);
                fromLoc.current = {line: deleteData.cursorLine, ch: deleteData.cursorCharacter};
                toLoc.current = {line: deleteData.cursorLine, ch: deleteData.cursorCharacter};
                clearHighlights();

                // console.log(`Requesting to delete characters from ${charStart} to ${charEnd}`)
                //Giver the server information about the deletion
                // console.log("Sending: ");
                // console.log({id: sessionID, username: user, startChar: charStart, endChar: charEnd, lastChange: lastOtherChange.current, editNumber: editNumber.current});

                temporary = temporary.substring(0, charStart) + `{_${temporary.substring(charStart, charEnd)}_}` + temporary.substring(charEnd);

                outerSocket.current.emit('remove', {extraInfo: temporary, id: sessionID, username: user, startChar: charStart, endChar: charEnd, lastChange: lastOtherChange.current, editNumber: editNumber.current, language: currentLanguage});
                editNumber.current += 1;

                //Do this last
                changes.current.push({type: 'delete', startChar: charStart, endChar: charEnd});
                // console.log("Increased changes.length to " + changes.length);


                if(flag){
                    charStart = 0;
                    charEnd = 1;
                    deleteData = handleRemoval(valueRef.current, charStart, charEnd);
                
                    // console.log(valueRef.current.length);
                    setValue(deleteData.newValue);
                    
                    setCursor(deleteData.cursorLine, deleteData.cursorCharacter);
                    fromLoc.current = {line: deleteData.cursorLine, ch: deleteData.cursorCharacter};
                    toLoc.current = {line: deleteData.cursorLine, ch: deleteData.cursorCharacter};
                    clearHighlights();

                    console.log(`Requesting to delete characters from ${charStart} to ${charEnd}`)
                    //Giver the server information about the deletion
                    // console.log("Sending: ");
                    // console.log({id: sessionID, username: user, startChar: charStart, endChar: charEnd, lastChange: lastOtherChange.current, editNumber: editNumber.current});

                    temporary = temporary.substring(0, charStart) + `{_${temporary.substring(charStart, charEnd)}_}` + temporary.substring(charEnd);

                    outerSocket.current.emit('remove', {extraInfo: temporary, id: sessionID, username: user, startChar: charStart, endChar: charEnd, lastChange: lastOtherChange.current, editNumber: editNumber.current, language: currentLanguage});
                    editNumber.current += 1;

                    //Do this last
                    changes.current.push({type: 'delete', startChar: charStart, endChar: charEnd});
                    // console.log("Increased changes.length to " + changes.length);
                }
            }
        }
    }
    useEffect(() => {
        //When the page mounts, create a socket to connect to the server
        const socket = socketIOClient(endpoint);

        //Store the socket in a useRef to make it accessible permanently outside the scope of this useEffect call
        outerSocket.current = socket;

        console.log(typeof runCode);
        console.log(typeof runnerFunction.current);
        runnerFunction.current = runCode;

        //Pass the socket to the FullEditorPage
        setSocket(socket);

        if(outerEditor.current){
            // outerEditor.current.on('mouseup', handleMouseUp);
            outerEditor.current.on('mousedown', handleMouseDown);

        }
        // Attach the event listener
        document.addEventListener('mouseup', handleMouseUp);

        // Clean up the event listener on component unmount
      

        

        // console.log(typeof addLine);
        // setFunction(runCode);

        return () => {
            socket.disconnect();
            document.removeEventListener('mouseup', handleMouseUp);

        };
    }, [])

    useEffect(() => {
        console.log("Session ID was fr changed");
        console.log(sessionID);
        if(runCode !== undefined){
            runnerFunction.current = runCode;

        }
        outerSocket.current.on('t-'+sessionID, (msg) => {
            // console.log(msg.data);
            if(addLine !== undefined){
                
                
                // console.log(typeof addLine);
                addLine(msg.data);
            }
        })
        outerSocket.current.on('problemsArray', (msg) => {
            problemsSetter(msg);
        });
        outerSocket.current.on(sessionID, (msg)=>{
            console.log(msg);
            // console.log("Current value: " + valueRef.current);
            if(msg.join){
                // console.log("Setting value to " + msg.value);
                loadingSetter1(false);
                setValue(msg.value);
                console.log(msg);
                
            }else if(msg.language === currentLanguage){
                console.log("Recieved:");
                console.log(msg);

                //number, props, username, sessionID
                // console.log(msg.username);
                // console.log(user);
                if(msg.username === user){
                    console.log("That was my edit")
                    lastMyChange.current = msg.number;
                    myChangesRecieved.current++;
                    // console.log("Incremented myChangesRecieved to " + myChangesRecieved.current)
                }else{
                    
                    let location;
                    if(msg.startChar !== undefined){
                        location = msg.startChar;
                    }else if(msg.atChar !== undefined){
                        location = msg.atChar;
                    }

                    //Calculate offset
                    
                    let offset = 0;
                    if(lastMyChange.current !== undefined){
                        let missedChangesNum = changes.current.length - myChangesRecieved.current;
                        // console.log("Found discrepancy of length " + missedChangesNum);
                        if(missedChangesNum !== 0){
                            for(let i = 0; i < missedChangesNum; i++){
                                const undoChange = changes.current[changes.current.length - 1 - i];

                                if(undoChange.type === 'delete'){
                                    if(undoChange.endChar < location){
                                        offset -= (undoChange.endChar - undoChange.startChar);
                                    }
                                }else if(undoChange.type === 'add'){
                                    if(undoChange.atChar < location){
                                        offset += undoChange.inserted.length;
                                    }
                                }
                            }
                        }
                    }
                    
                    // console.log(offset);
                    // console.log(valueRef.current);

                    
                    //Fix blocking
                    preventCursor.current = true;
                    if(msg.type === 'remove'){
                        preventCursor.current= false;
                        const removalObject = handleOtherUserRemoval(valueRef.current, msg.startChar + offset, msg.endChar + offset);

                        let currentPosition = lineToChar(valueRef.current, cursorLine.current, cursorCharacter.current);
                        if(msg.endChar < currentPosition){
                            // console.log(currentPosition);
                            // currentPosition -= (msg.endChar - msg.startChar);
                            const lineObject = charToLine(valueRef.current, currentPosition);
                            setCursor(lineObject.line, lineObject.char);
                        }
                        preventCursor.current = true;
                        setValue(removalObject);
                        

                    }else if(msg.type === 'add'){
                        preventCursor.current= false;
                        const additionObject = handleOtherUserAddition(valueRef.current, msg.text, msg.atChar + offset);

                        let currentPosition = lineToChar(valueRef.current, cursorLine.current, cursorCharacter.current);
                        if(msg.atChar < currentPosition){
                            // console.log(currentPosition);
                            // currentPosition += (msg.text.length);
                            // console.log(currentPosition);
                            // console.log(msg.text.length);
                            const lineObject = charToLine(valueRef.current, currentPosition);
                            setCursor(lineObject.line, lineObject.char);
                        }
                        preventCursor.current = true;
                        setValue(additionObject);

                    }

                    
                }
                // console.log(lastOtherChange.current);
                lastOtherChange.current.username = msg.username;
                lastOtherChange.current.number = msg.number;
            }
            setCursor(cursorLine.current, cursorCharacter.current);

        });
        
        return () =>{

        }

    }, [sessionID])

    useEffect(() =>{
        if (outerEditor.current) {
            console.log("Value is now " + value);
        }
    }, [value])
  

    return (
        <div className="state-all">
            <ControlledEditor
                onBeforeChange={handleChange}
                onCursorActivity={handleCursorActivity}
                value= {value}
                className="code-mirror-wrapper"
                options={{
                    lineWrapping: true,
                    lint: true,
                    mode: currentLanguage,
                    lineNumbers: true,
                    indentWithTabs: true, // Use tabs instead of spaces
                    tabSize: 2, // Set tab size to 2 spaces (or any value you prefer)
                    smartIndent: false, // Disable smart indentation
                }}
                editorDidMount={(editor) => {
                    outerEditor.current = editor;
                    
                    editor.setSize('49vw','86.4vh');
                }}
                onKeyDown={handleKeyDown}
                
            />
          

        </div>
     )
}

export default EditorStateManager






//Editor Functions
function handleOtherUserAddition(text, insert, atChar){
    text = text.substring(0, atChar) +  insert + text.substring(atChar);
    return text;
}
function handleOtherUserRemoval(text, fromChar, toChar){
    text = text.substring(0, fromChar) + text.substring(toChar);
    return text;
}


function handleAddition(text, insert, atChar){
    let offset = 0;

    if(insert.includes("\n")){
        let flag = false;
        if(insert === "\n" && text.substring(atChar-1, atChar) === "{" && text.substring(atChar, atChar+1) === "}"){
            insert = "\n\n";
            flag = true;
            offset++;
        }
        let temp = text.substring(0, atChar)
        // console.log(temp);
        let unclosedParenthesisCount = 0;
        for(let i = 0; i < temp.length; i++){
            // console.log(temp.substring(i, i+1) === "}");
            if(temp.substring(i, i+1) === '{' && (i === 0 || !(temp.substring(i-1, i) === "\\"))){
                // console.log(temp.substring(i, i+1));
                unclosedParenthesisCount++;
            }else if(temp.substring(i, i+1) === '}' && (i === 0 || !(temp.substring(i-1, i) === "\\"))){
                // console.log(temp.substring(i, i+1));
                unclosedParenthesisCount--;
            }
        }
        // console.log("count: " + unclosedParenthesisCount);

        offset += unclosedParenthesisCount - 1;
        let tabs = "";
        if(unclosedParenthesisCount > 0){
            for(let j = 0; j < unclosedParenthesisCount; j++){
                
               tabs += "\t"
            }
            for(let i = 0; i < insert.length; i++){
                if(i === 0 || insert[i] === "\n"){
                    insert = insert.substring(0, i+1) + tabs + insert.substring(i+1, insert.length);
                    i += tabs.length;
                    
                }
            }
        }
        if(flag && text.length > atChar && text.substring(atChar, atChar+1) === "}"){
            insert = insert.substring(0, insert.length - 1);
        }

    }

    text = text.substring(0, atChar) +  insert + text.substring(atChar);

    if(insert === "\"\"" || insert === "\{\}" || insert === "\(\)" || insert === "\[\]" || insert === "\'\'"){
        offset += 1;
    }



    const cursorPosition = charToLine(text, atChar+insert.length-offset);


    return({newValue: text, cursorLine: cursorPosition.line, inserted: insert, cursorCharacter: cursorPosition.char});
}

function handleRemoval(text, fromChar, toChar){
    
    //Remove the requested region from text
    text = text.substring(0, fromChar) + text.substring(toChar);

    //Find the new cursor position
    const cursorPosition = charToLine(text, fromChar);

    //Return the new data
    return({newValue: text, cursorLine: cursorPosition.line, cursorCharacter: cursorPosition.char})
}

function charToLine(text, char){
    
    let lineToChar2 = [];
    lineToChar2.push(0);
    for(let i = 0; i < text.length;i++){
        if(text[i] === '\n'){
            lineToChar2.push(i+1);
        }
    }
    let index = 0;
    let distance = char - lineToChar2[0];
    for(let i = 1; i <lineToChar2.length; i++){
        if(char-lineToChar2[i] < distance && char >= lineToChar2[i]){
            index = i;
            distance = char - lineToChar2[i];
        }
    }
    // console.log("Recieved character " + char);
    // console.log(lineToChar2);
    
    return({line: index, char: char-lineToChar2[index]})
}

function lineToChar(text, line, char){
    let lineToChar2 = [];

    lineToChar2.push(0);

    for(let i = 0; i < text.length; i++){
        if(text[i] === '\n'){
            lineToChar2.push(i+1);
        }
    }



    return lineToChar2[line]+char;
}

function dataToString(text){
    let text2 = "";

    if(text.length > 1 && text[0] === "" && text[1] === ""){
        text2 = "\n";
    }else{
        
        //If one of a certain group of characters are typed, automatically close them
        if(text.length === 1){
            if(text[0] === "\{"){
                text[0] = "{}";
            }else if(text[0] === "\(" ){
                text[0] = "()";
            }else if(text[0] === '\['){
                text[0] = "[]";
            }if(text[0] === "\"" || text[0] === "\'"){
                text[0] += text[0];
            }
        }

        //For multi-line additions, add line breaks at the end of each line
        text2 = "";
        for(let i = 0; i <text.length;i++){
            text2 += text[i];
            if(i !== text.length - 1){
                text2 += '\n';
            }
        }
    }

    return(text2);
}
import React, {useEffect, useState} from 'react'
import './TerminalObject.css'

function TerminalObject({time, text}) {
    const [lines, setLines] = useState([])
    useEffect(() => {
        setLines([])
        console.log("AAAAAAAA!!!!!")
        console.log(typeof text)
        console.log(text);
        let currentText = ""
        let tempLines = []
        for(let i = 0; i < text.length; i++){
            const char = text.substring(i, i+1);
            if(char === "\n"){
                console.log("newline found")
                    if(!(/^\s*$/.test(currentText))){
                        tempLines.push(time + ">> "+currentText);
                    }else{
                        tempLines.push(currentText);
                    }
                
                currentText = "";
            }else{
                currentText += char;
            }
        }
        console.log(time + ">>" + currentText)
        
            if(!/^\s*$/.test(currentText)){
                setLines([...tempLines, time + ">> " + currentText])
            }else{
                setLines([...tempLines, currentText])
            }
        
        
    }, [])
    useEffect(() => {
        console.log("Lines:");
        console.log(lines)
    }, [lines])
  return (
    <div className='terminalObjAll'>
        {lines.map((obj) => (
            <div className='line'>
                {obj}
            </div>
        ))}
      
    </div>
  )
}

export default TerminalObject

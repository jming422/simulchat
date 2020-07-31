import React, { useState, useCallback, useEffect } from 'react';
import axios from 'axios';
import useWebSocket from 'react-use-websocket';

import './App.css';

function App() {
  const wsUrl = (window.location.protocol === 'https:' ? 'wss://' : 'ws://') + window.location.host + '/ws';
  const [messages, setMessages] = useState([]);
  const { sendMessage, lastMessage } = useWebSocket(wsUrl, { shouldReconnect: () => true });

  useEffect(() => {
    if (lastMessage) {
      setMessages((old) => old.concat(lastMessage));
    }
  }, [lastMessage]);

  const sendThingy = useCallback(() => {
    console.log(`Sending message`);
    sendMessage('Hello there hi');
  }, [sendMessage]);

  const [thing, setThing] = useState({});
  const pingPong = async () => {
    try {
      const { status, data } = await axios.get('/api/ping');
      setThing({ status, data });
    } catch (err) {
      const { status, data } = err.response;
      setThing({ status, data });
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <ul>
          {messages.map((msg, i) => (
            <li key={i}>{msg?.data}</li>
          ))}
        </ul>
        <button onClick={sendThingy}>CLICK HERE</button>
        <p>
          Server told us {thing.status ?? 'nothing'} - {thing.data ?? 'nothing at all'}
        </p>
        <button onClick={pingPong}>OR HERE</button>
      </header>
    </div>
  );
}

export default App;

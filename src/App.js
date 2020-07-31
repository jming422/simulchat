/** @jsx jsx */
/** @jsxFrag React.Fragment */
import React, { useState, useRef, useEffect } from 'react'; // eslint-disable-line
import { jsx, css, keyframes } from '@emotion/core';
import _ from 'lodash';

import useCRDT from './hooks/useCRDT';

import './App.css';

const container = css`
  width: 100vw;
  height: 100vh;
  margin: 2rem;
  display: flex;
  justify-content: space-around;
`;

const buttonStyle = css`
  padding: 0.75rem;
  border-radius: 0.75rem;
  font-weight: bold;
`;
const buttonMain = css`
  ${buttonStyle}
  color: var(--bg);
  background-color: var(--pri);
`;

const chatBoxStyle = css`
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: center;
  background-color: var(--sec);
  border: 0.5rem solid var(--fg);
  border-radius: 0.75rem;
  padding: 0rem 1rem;
  margin: 2rem;
  max-height: 20rem; // TODO USE CSS GRID
  min-width: 22rem;
`;

function ChatBox({ username, content }) {
  return (
    <div css={chatBoxStyle}>
      <h3>{username}</h3>
      <pre>{content}</pre>
    </div>
  );
}

const anchored = css`
  position: absolute;
  bottom: 2rem;
  left: calc(50% - 11rem);
`;

const inputPrompt = css`
  width: 80%;
  margin: 1rem;
  padding: 0.75rem;
  border-radius: 0.75rem;
  font-weight: bold;
  color: var(--pri);
  background-color: var(--bg);
`;

function MyChatBox({ username, content, updateText }) {
  const inputRef = useRef(null);
  useEffect(() => {
    inputRef.current.focus();
  }, []);

  const handleChange = (e) => {
    updateText(e.target.value);
  };

  return (
    <div css={[chatBoxStyle, anchored]}>
      <h3>{username}</h3>
      <pre>{content}</pre>
      <div css={inputPrompt}>
        &gt; <textarea ref={inputRef} tabIndex="0" onChange={handleChange} rows="1" cols="20" />
      </div>
    </div>
  );
}

const roomStyle = css`
  height: 100%;
  display: flex;
  flex-direction: row;
`;

function ChatRoom({ username }) {
  const wsUrl = (window.location.protocol === 'https:' ? 'wss://' : 'ws://') + window.location.host + '/ws';
  const [docSet, changeDoc] = useCRDT(wsUrl);

  const users = _(docSet).keys().without(username).value();

  if (!(username in docSet)) {
    changeDoc(username, { text: '' });
  }

  const updateText = (newText) => {
    changeDoc(username, (oldDoc) => {
      oldDoc.text = newText;
    });
  };

  return (
    <div css={roomStyle}>
      {users.map((user) => (
        <ChatBox key={user} username={user} content={docSet[user]?.text} />
      ))}
      <MyChatBox username={username} content={docSet[username]?.text} updateText={updateText} />
    </div>
  );
}

const promptStyle = css`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
`;
function PromptForName({ setUsername }) {
  const [input, setInput] = useState('');
  return (
    <div css={promptStyle}>
      <h2 css={{ marginBottom: '4rem' }}>Who are you?</h2>
      <input value={input} onChange={(e) => setInput(e.target.value)} />
      <div css={[buttonMain, { marginTop: '4rem' }]} onClick={() => setUsername(input)}>
        That's me I promise
      </div>
    </div>
  );
}

function App() {
  const [username, setUsername] = useState();

  return (
    <div css={container}>
      {username ? <ChatRoom username={username} /> : <PromptForName setUsername={setUsername} />}
    </div>
  );
}

export default App;

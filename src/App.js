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
  min-width: 20rem;
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

const blinkKF = (color) => keyframes`
    0%   { color: ${color}; }
    49%  { color: ${color}; }
    60%  { color: transparent; }
    99%  { color: transparent; }
    100% { color: ${color}; }
`;

const blinker = (color) => css`
  animation: ${blinkKF(color)} 1.2s infinite;
`;

function MyChatBox({ username, content, updateText }) {
  const fakeInputRef = useRef(null);
  useEffect(() => {
    fakeInputRef.current.focus();
  }, [fakeInputRef]);

  const handleKeyPress = (e) => {
    updateText(e.key);
  };

  return (
    <div css={[chatBoxStyle, anchored]}>
      <h3>{username}</h3>
      <pre>{content}</pre>
      <div ref={fakeInputRef} css={inputPrompt} tabIndex="0" onKeyPress={handleKeyPress}>
        &gt; <span css={blinker('var(--pri)')}>|</span>
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
  const [doc, changeDoc] = useCRDT('thedoc', wsUrl, {
    testPerson: 'some text in here\nmoretextafternewline',
    testOtherPerson: 'some text in here\nmoretextafternewline',
    testAnotherPerson: 'some text in here\nmoretextafternewline',
    testMyPerson: 'some text in here\nmoretextafternewline',
  });

  const users = _(doc).keys().without(username).value();

  if (!(username in doc)) {
    changeDoc((oldDoc) => {
      oldDoc[username] = '';
    });
  }

  const updateText = (newText) => {
    changeDoc((oldDoc) => {
      oldDoc[username] += newText;
    });
  };

  return (
    <div css={roomStyle}>
      {users.map((user) => (
        <ChatBox key={user} username={user} content={doc[user]} />
      ))}
      <MyChatBox username={username} content={doc[username]} updateText={updateText} />
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

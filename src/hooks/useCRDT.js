import { useEffect, useRef, useState, useCallback } from 'react';
import useWebSocket, { ReadyState } from 'react-use-websocket';
import * as Automerge from 'automerge';

/**
 * Replicates an Automerge document over WebSockets
 * with one other peer (may not work with > 2 peers)
 *
 * @param {string} wsUri URI of the WebSocket endpoint
 * @returns {[object, function]} [doc, changeDoc]. `doc` is a POD JavaScript object and `changeDoc` executes your change
 * function on `doc` to get a new `doc`. So `changeDoc` is different from `setState` in that you mutate `doc` in your
 * function instead of taking the old `doc` and producing a new `doc`.
 */
function useCRDT(wsUri) {
  const { lastJsonMessage, sendJsonMessage, readyState } = useWebSocket(wsUri);

  const docSetRef = useRef(new Automerge.DocSet());
  const conn = useRef(null);

  const [docSetJS, setDocSetJS] = useState({});
  useEffect(() => {
    const docset = docSetRef.current;
    const handler = (docId, newDoc) => setDocSetJS((oldDocSetJS) => ({ ...oldDocSetJS, [docId]: newDoc }));
    docset.registerHandler(handler);
    return () => {
      docset.unregisterHandler(handler);
    };
  }, []);

  const changeDoc = useCallback((docId, updates) => {
    const docset = docSetRef.current;
    if (typeof updates === 'function') {
      docset.setDoc(docId, Automerge.change(docset.getDoc(docId), updates));
    } else {
      docset.setDoc(docId, Automerge.from(updates));
    }
  }, []);

  useEffect(() => {
    conn.current = new Automerge.Connection(docSetRef.current, (msg) => {
      console.log(`sendMsg => ${JSON.stringify(msg)}`);
      return sendJsonMessage(msg);
    });
    return () => {
      conn.current = null;
    };
  }, [sendJsonMessage]);

  useEffect(() => {
    if (conn.current) {
      switch (readyState) {
        case ReadyState.OPEN:
          conn.current.open();
          break;
        case ReadyState.CLOSING:
        case ReadyState.CLOSED:
          conn.current.close();
          break;
        default:
          break;
      }
    }
    return () => {
      // okay to call close multiple times
      if (conn.current) conn.current.close();
    };
  }, [readyState]);

  useEffect(() => {
    if (readyState === ReadyState.OPEN && conn.current && lastJsonMessage) {
      console.log(`receiveMsg <= ${JSON.stringify(lastJsonMessage)}`);
      conn.current.receiveMsg(lastJsonMessage);
    }
  }, [lastJsonMessage, readyState]);

  return [docSetJS, changeDoc];
}

export default useCRDT;

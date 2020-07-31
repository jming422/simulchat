import { useReducer, useEffect, useRef, useMemo, useState } from 'react';
import useWebSocket, { ReadyState } from 'react-use-websocket';
import * as Automerge from 'automerge';

/**
 * Applies the change function to the Automerge document and returns the new document
 * @param {object} doc
 * @param {function} changeFn
 */
function docReducer(doc, { changeFn }) {
  console.log(`DOC BEFORE: ${JSON.stringify(doc)}`);
  const newDoc = Automerge.change(doc, changeFn);
  console.log(`DOC AFTER: ${JSON.stringify(newDoc)}`);
  return newDoc;
}

/**
 * Replicates an Automerge document over WebSockets
 * with one other peer (may not work with > 2 peers)
 *
 * @param {string} docId A unique identifier of the document and must be the same across peers to see the same data
 * @param {string} wsUri URI of the WebSocket endpoint
 * @param {object} docInitState The initial state of the document. If falsy an empty object is used as the initial state
 * @returns {[object, function]} [doc, changeDoc]. `doc` is a POD JavaScript object and `changeDoc` executes your change
 * function on `doc` to get a new `doc`. So `changeDoc` is different from `setState` in that you mutate `doc` in your
 * function instead of taking the old `doc` and producing a new `doc`.
 */
function useCRDT(docId, wsUri, docInitState = null) {
  const [doc, dispatch] = useReducer(docReducer, docInitState, (initState) => Automerge.from(initState || {}));

  const changeDoc = useMemo(() => (changeFn) => dispatch({ changeFn }), [dispatch]);

  const [docSet, setDocSet] = useState(() => new Automerge.DocSet());

  useEffect(() => {
    setDocSet((dSet) => {
      console.log(`setDoc: ${JSON.stringify(docId)} ${JSON.stringify(doc)}`);
      dSet.setDoc(docId, doc);
      return dSet;
    });
  }, [docId, doc]);

  const { lastJsonMessage, sendJsonMessage, readyState } = useWebSocket(wsUri);

  const conn = useRef(null);

  useEffect(() => {
    conn.current = new Automerge.Connection(docSet, (msg) => {
      console.log(`sendMsg => ${JSON.stringify(msg)}`);
      return sendJsonMessage(msg);
    });
    return () => {
      conn.current = null;
    };
  }, [docSet, sendJsonMessage]);

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

  return [doc, changeDoc];
}

export default useCRDT;

import { useReducer, useEffect, useRef, useMemo, useState } from 'react';
import useWebSocket, { ReadyState } from 'react-use-websocket';
import * as Automerge from 'automerge';

/**
 * Replicates an Automerge document over WebSockets
 * with one other peer (may not work with > 2 peers)
 *
 * @param {string} docId A unique identifier of the document and must be the same across peers to see the same data
 * @param {string} wsUri URI of the WebSocket endpoint
 * @param {object} docInitState The initial state of the document. If falsy a new blank document is created
 */
function useCRDT(docId, wsUri, docInitState = null) {
  const [doc, dispatch] = useReducer(
    (doc, { commitMsg, changeFn }) => doc.change(commitMsg, changeFn),
    docInitState,
    (initState) => (initState ? Automerge.from(initState) : Automerge.init())
  );
  const changeDoc = useMemo(() => (commitMsg, changeFn) => dispatch({ commitMsg, changeFn }), [dispatch]);

  const [docSet, setDocSet] = useState(new Automerge.DocSet());

  useEffect(() => {
    setDocSet((dSet) => {
      dSet.setDoc(docId, doc);
      return dSet;
    });
  }, [setDocSet, docId, doc]);

  const { lastJsonMessage, sendJsonMessage, readyState } = useWebSocket(wsUri);

  const conn = useRef(null);

  useEffect(() => {
    conn.current = new Automerge.Connection(docSet, sendJsonMessage);
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
    if (readyState === ReadyState.OPEN && conn.current) {
      conn.current.receiveMsg(lastJsonMessage);
    }
  }, [lastJsonMessage, readyState]);

  return [doc, changeDoc];
}

export default useCRDT;

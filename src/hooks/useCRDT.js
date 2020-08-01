import { useEffect, useState, useCallback } from 'react';
import useWebSocket, { ReadyState } from 'react-use-websocket';
import * as Automerge from 'automerge';

/**
 * Replicates an Automerge document over WebSockets
 * (assuming the WebSocket server echos messages to all other clients)
 *
 * @param {string} wsUri URI of the WebSocket endpoint
 * @param {object} docInitState the document will be initialized to this object or an empty object if this is falsy
 * @returns {[object, function]} [doc, changeDoc]. `doc` is a POD JavaScript object and `changeDoc` executes your change
 * function on `doc` to get a new `doc`. So `changeDoc` is different from `setState` in that you mutate `doc` in your
 * function instead of taking the old `doc` and producing a new `doc`.
 */
function useCRDT(wsUri, docInitState) {
  const { lastJsonMessage, sendJsonMessage, readyState } = useWebSocket(wsUri);
  const [doc, setDoc] = useState(() => Automerge.from(docInitState || {}));
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (readyState !== ReadyState.OPEN) setOpen(false);
  }, [readyState]);

  useEffect(() => {
    if (readyState === ReadyState.OPEN && !open) {
      setOpen(true);
      sendJsonMessage(Automerge.getAllChanges(doc));
    }
  }, [readyState, open, sendJsonMessage, doc]);

  useEffect(() => {
    if (lastJsonMessage && readyState === ReadyState.OPEN) {
      setDoc((d) => Automerge.applyChanges(d, lastJsonMessage));
    }
  }, [lastJsonMessage, readyState]);

  const changeDoc = useCallback(
    (changeFn) =>
      setDoc((d) => {
        const newDoc = Automerge.change(d, changeFn);
        if (readyState === ReadyState.OPEN) {
          sendJsonMessage(Automerge.getChanges(d, newDoc));
        }
        return newDoc;
      }),
    [sendJsonMessage, readyState]
  );

  return [doc, changeDoc];
}

export default useCRDT;

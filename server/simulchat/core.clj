(ns simulchat.core
  (:require
   [immutant.web :as web]
   [immutant.web.async :as async]
   [immutant.web.middleware :as web-middleware]
   [compojure.route :as route]
   [environ.core :refer (env)]
   [compojure.core :refer (ANY GET defroutes context)]
   [ring.util.response :refer (response redirect content-type)])
  (:gen-class))

(defonce websocket-clients (atom #{}))

(def websocket-callbacks
  "WebSocket callback functions"
  {:on-open (fn [channel]
              (let [clients (swap! websocket-clients conj channel)]
                (when (< 2 (count clients))
                  (async/close channel))))
   :on-close (fn [channel] (swap! websocket-clients disj channel))
   :on-message (fn [ch m]
                 (doseq [c (remove #{ch} @websocket-clients)]
                   (async/send! c m)))})

(defroutes routes
  (GET "/" {c :context} (redirect (str c "/index.html")))
  (context "/api" []
    (GET "/ping" [] "pong"))
  (route/resources "/" {:root "build"}))

(defonce server (atom nil))

(defn -main [& {:as args}]
  (reset! server
          (web/run
           (-> routes
               (web-middleware/wrap-session {:timeout 20})
               ;; wrap the handler with websocket support
               ;; websocket requests will go to the callbacks, ring requests to the handler
               (web-middleware/wrap-websocket websocket-callbacks))
           (merge {"host" (or (env :host) "localhost") "port" (or (env :port) "5000")} args))))

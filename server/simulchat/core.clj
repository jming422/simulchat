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

(def websocket-callbacks
  "WebSocket callback functions"
  {:on-open (fn [channel]
              (async/send! channel "Ready to reverse your messages!"))
   :on-close (fn [channel {:keys [code reason]}]
               (println "close code:" code "reason:" reason))
   :on-message (fn [ch m]
                 (async/send! ch (apply str (reverse m))))})

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

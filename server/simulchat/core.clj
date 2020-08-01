(ns simulchat.core
  (:require
   [clojure.data.json :as json]
   [immutant.web :as web]
   [immutant.web.async :as async]
   [immutant.web.middleware :as web-middleware]
   [compojure.route :as route]
   [environ.core :refer (env)]
   [compojure.core :refer (GET defroutes context)]
   [ring.util.response :refer (redirect)])
  (:gen-class))

(defonce changes (atom []))
(defonce websocket-clients (atom #{}))

(def websocket-callbacks
  "WebSocket callback functions"
  {:on-open (fn [channel]
              (println "Opening WebSocket connection")
              (swap! websocket-clients conj channel)
              (async/send! channel (json/write-str @changes)))
   :on-close (fn [channel {:keys [code reason]}]
               (println (str "Closing WebSocket connection (code " code ", reason " reason ")"))
               (let [clients (swap! websocket-clients disj channel)]
                 ;; TODO: squash race condition
                 ;; clients could have changed and become non-zero
                 (when (zero? (count clients))
                   (reset! changes []))))
   :on-message (fn [ch m]
                 (println "Received message:" m)
                 (swap! changes #(vec (concat %1 %2)) (json/read-str m))
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

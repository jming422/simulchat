(ns simulchat.core
  (:require
   [immutant.web :as web]
   [immutant.web.async :as async]
   [immutant.web.middleware :as web-middleware]
   [compojure.route :as route]
   [environ.core :refer (env)]
   [compojure.core :refer (GET defroutes context)]
   [ring.util.response :refer (redirect)])
  (:gen-class))

(defonce websocket-clients (atom []))

(def websocket-callbacks
  "WebSocket callback functions"
  {:on-open (fn [channel]
              (println "Opening WebSocket connection")
              (let [clients (swap! websocket-clients
                                   (fn [l c]
                                     (if-not (first (filter #{c} l))
                                       (conj l c)
                                       l))
                                   channel)]
                (when (< 2 (count clients))
                  (println "Exceeded max of 2 WebSocket connections! Closing current one...")
                  (async/close channel))))
   :on-close (fn [channel {:keys [code reason]}]
               (println "Closing WebSocket connection (code " code ", reason " reason ")")
               (swap! websocket-clients (fn [l c] (vec (remove #{c} l))) channel))
   :on-message (fn [ch m]
                 (let [clients @websocket-clients
                       i (first (filter #(= ch (nth clients %)) (range (count clients))))]
                   (println m "from client" (+ i 1))
                   (doseq [c (remove #{ch} clients)]
                     (async/send! c m))))})

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

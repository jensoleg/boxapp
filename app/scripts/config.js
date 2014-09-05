"use strict";

 angular.module("config", [])

.constant("ENV", {
  "name": "development",
  "auth": {
    "domain": "decoplant.auth0.com",
    "clientID": "riQAyvtyyRBNvO9zhRsQAXMEtaQA02uW"
  },
  "apiEndpoint": "/api/",
  "MQTTServer": "mqtt.bobbytechnologies.dk"
})

;
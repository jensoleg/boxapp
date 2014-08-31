"use strict";

 angular.module("config", [])

.constant("ENV", {
  "name": "production",
  "auth": {
    "domain": "decoplant.auth0.com",
    "clientID": "riQAyvtyyRBNvO9zhRsQAXMEtaQA02uW"
  },
  "apiEndpoint": ".bobbytechnologies.dk/api/",
  "MQTTServer": "mqtt.bobbytechnologies.dk"
})

;
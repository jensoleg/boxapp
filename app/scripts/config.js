"use strict";

 angular.module("config", [])

.constant("ENV", {
  "name": "production",
  "auth": {
    "domain": "decoplant.auth0.com",
    "clientID": "riQAyvtyyRBNvO9zhRsQAXMEtaQA02uW"
  },
  "domainPrefix": true,
  "apiEndpoint": "bobbytech.dk/api/",
  "MQTTServer": "mqtt.bobbytech.dk"
})

;
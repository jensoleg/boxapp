"use strict";

 angular.module("config", [])

.constant("ENV", {
  "name": "development",
  "auth": {
    "domain": "development.auth0.com",
    "clientID": "kpWrEQ5gJclwuAljKpHgNcJA3NwNZ0FL"
  },
  "domainPrefix": true,
  "apiEndpoint": "bobbytech.dk/api/",
  "MQTTServer": "mqtt.development.bobbytech.dk"
})

;
"use strict";

 angular.module("config", [])

.constant("ENV", {
  "name": "development",
  "auth": {
    "domain": "development.auth0.com",
    "clientID": "kpWrEQ5gJclwuAljKpHgNcJA3NwNZ0FL"
  },
  "apiEndpoint": "bobbytech.dk/api/",
  "MQTTServer": "mqtt.bobbytech.dk"
})

;
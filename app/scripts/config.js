"use strict";

 angular.module("config", [])

.constant("ENV", {
  "name": "local",
  "auth": {
    "domain": "development.auth0.com",
    "clientID": "kpWrEQ5gJclwuAljKpHgNcJA3NwNZ0FL"
  },
  "domainPrefix": false,
  "apiEndpoint": "localhost:8081/api/",
  "MQTTServer": "localhost"
})

;
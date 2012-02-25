
var express = require('express'),
    app = express.createServer(),
    io = require('socket.io').listen(app),
    assert = require('assert'),
    hat = require('hat'),
    authom = require('authom'),
    ROOM = 'room:default:room',
    github = authom.createServer({
      service: 'github',
      id: "f09d589b39a9b2960ee6",
      secret: "885131891a0576c859267adc6343f86c918ffca3"
    });

exports.run = function(app, db) {
};

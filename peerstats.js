#!/usr/bin/env node
var cjdnsadmin = require('./lib/cjdnsadmin');
var blessed = require('blessed');
var contrib = require('blessed-contrib');
var spacedtable = require('./lib/spacedtable');
var screen = blessed.screen();

var connectingBox = blessed.box({
  left: 'center',
  top: 'center',
  rows: 'shrink',
  width: 'shrink',
  border: {
    type: 'line'
  },
  content: 'Connecting to cjdns...'
});

// screen.append(connectingBox);

screen.key(['escape', 'q', 'C-c'], function(ch, key) {
  return process.exit(0);
});


var peerTable = spacedtable({
  keys: true,
  label: 'Peer Stats',
  columnSpacing: [60, 20, 15, 15, 15]
});


var updatePeerTable = function(err, peerstats) {
  if(peerstats) {
    var data = [];
    peerstats.peers.forEach(function(peer) {
      data.push([peer.publicKey, peer.state, peer.bytesIn, peer.bytesOut, peer.last]);
    });
    peerTable.setData({
      headers: ['Public Key', 'State', 'Bytes In', 'Bytes Out', 'last'],
      data: data
    });
    screen.render();
  } else {
    console.log('Failed to fetch peerStats!');
  }
};

function connectCB(cjdns) {
  screen.append(peerTable);
  peerTable.focus();
  cjdns.InterfaceController_peerStats(0, updatePeerTable);
  setInterval(function() {
    cjdns.InterfaceController_peerStats(0, updatePeerTable);
  }, 500);
}

cjdnsadmin.connectWithAdminInfo(connectCB);
screen.render();

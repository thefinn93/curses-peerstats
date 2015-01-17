#!/usr/bin/env node
var cjdnsadmin = require('./lib/cjdnsadmin');
var blessed = require('blessed');
// var contrib = require('blessed-contrib');
var spacedtable = require('./lib/spacedtable');
var publicToIp6 = require('./lib/publicToIp6').convert;
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

var convertpubkeys = true;

screen.key(['p'], function(ch, key) {
  if(convertpubkeys) {
    convertpubkeys = false;
  } else {
    convertpubkeys = true;
  }
});


var peerTable = spacedtable({
  keys: true,
  label: 'Peer Stats',
  columnSpacing: [60, 20, 20, 25, 12, 12, 15, 25, 15, 15]
});


var updatePeerTable = function(err, peerstats) {
  if(peerstats) {
    var data = [];
    peerstats.peers.forEach(function(peer) {
      var row = [peer.publicKey, (peer.user || "-"), peer.state, peer.switchLabel, peer.bytesIn, peer.bytesOut, peer.last, peer.receivedOutOfRange, peer.duplicates];
      if(peer.isIncoming == 1) {
        row.push('Yes');
      } else {
        row.push('No');
      }
      if(convertpubkeys) {
        row[0] = publicToIp6(peer.publicKey);
      }
      data.push(row);
    });
    peerTable.setData({
      headers: ['Public Key', 'User', 'State', 'Switch Label', 'Bytes In', 'Bytes Out', 'last', 'Received Out Of Range', 'Duplicates', 'Is Incoming?'],
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

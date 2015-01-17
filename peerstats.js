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
  columnSpacing: [60, 30, 20, 25, 12, 12, 15, 25, 15, 15]
});

var fetchPages = function(func, callback, page, results) {
  results = results || {};
  page = page || 0;
  func(page, function(err, newResult) {
    if (err) { throw err; }
    for(var key in newResult) {
      if(key) {
        if(typeof newResult[key] == "object") {
          if(results[key]) {
            results[key] = results[key].concat(newResult[key]);
          } else {
            results[key] = newResult[key];
          }
        }
      }
    }

    if (typeof newResult.more !== 'undefined') {
      fetchPages(func, callback, page + 1, results);
    } else {
      callback(results);
    }
  });
};

var updatePeerTable = function(peerstats) {
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
    try {
      peerTable.setData({
        headers: ['Public Key', 'User', 'State', 'Switch Label', 'Bytes In', 'Bytes Out', 'last', 'Received Out Of Range', 'Duplicates', 'Is Incoming?'],
        data: data
      });
    } catch(e) {
      console.log(e.stack || e );
      console.log(JSON.stringify(data));
      // process.exit(1);
    }
    screen.render();
  } else {
    console.log('Failed to fetch peerStats!');
  }
};

function connectCB(cjdns) {
  screen.append(peerTable);
  peerTable.focus();
  fetchPages(cjdns.InterfaceController_peerStats, updatePeerTable);
  setInterval(function() {
    fetchPages(cjdns.InterfaceController_peerStats, updatePeerTable);
  }, 500);
}

cjdnsadmin.connectWithAdminInfo(connectCB);

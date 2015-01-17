#!/usr/bin/env node
var cjdnsadmin = require('./lib/cjdnsadmin');
var blessed = require('blessed');
var contrib = require('blessed-contrib');
var spacedtable = require('./lib/spacedtable');
var publicToIp6 = require('./lib/publicToIp6').convert;
var screen = blessed.screen();

var grid = new contrib.grid({rows: 2, cols: 1});


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

grid.set(0, 0, spacedtable, {
  keys: true,
  label: 'Peer Stats',
  columnSpacing: [60, 30, 20, 25, 12, 12, 15, 25, 15, 15]
});
grid.set(1, 0, contrib.sparklines, {label: 'Throughput'});


grid.applyLayout(screen);
screen.render();

var peerTable = grid.get(0, 0);
var sparkline = grid.get(1, 0);
var history = {};

var storeHistory = function(peers) {
  var historyLength = 30;
  peers.forEach(function(peer) {
    if(history[peer.publicKey] === undefined) {
      history[peer.publicKey] = {
        in: [],
        out: []
      };
    }
    history[peer.publicKey].in.push(peer.bytesIn);
    history[peer.publicKey].out.push(peer.bytesOut);
    if(history[peer.publicKey].in.length > historyLength) {
      history[peer.publicKey].in.shift();
      history[peer.publicKey].out.shift();
    }
  });
};

var showSparkline = function() {
  // Some way to detect the currently selected peer
  sparkline.setData(['Upload', 'Download'], [history]);
};

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
    peerTable.setData({
      headers: ['Public Key', 'User', 'State', 'Switch Label', 'Bytes In', 'Bytes Out', 'last', 'Received Out Of Range', 'Duplicates', 'Is Incoming?'],
      data: data
    });
    screen.render();
    storeHistory(peerstats.peers);
  } else {
    console.log('Failed to fetch peerStats!');
  }
};

function connectCB(cjdns) {
  fetchPages(cjdns.InterfaceController_peerStats, updatePeerTable);
  setInterval(function() {
    fetchPages(cjdns.InterfaceController_peerStats, updatePeerTable);
  }, 500);
}

cjdnsadmin.connectWithAdminInfo(connectCB);

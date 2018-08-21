/*
 * Copyright (c) 2016-2018 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const async = require('async');
const bedrock = require('bedrock');
const config = bedrock.config;
const brIdentity = require('bedrock-identity');
const brLedgerNode = require('bedrock-ledger-node');
const crypto = require('crypto');
const database = require('bedrock-mongodb');
const jsonld = bedrock.jsonld;
const jsigs = require('jsonld-signatures')();
const uuid = require('uuid/v4');

const api = {};
module.exports = api;

// FIXME: Do not use an insecure document loader in production
const nodeDocumentLoader = jsonld.documentLoaders.node({
  secure: false,
  strictSSL: false
});
jsonld.documentLoader = (url, callback) => {
  if(url in config.constants.CONTEXTS) {
    return callback(
      null, {
        contextUrl: null,
        document: config.constants.CONTEXTS[url],
        documentUrl: url
      });
  }
  nodeDocumentLoader(url, callback);
};

// use local JSON-LD processor for checking signatures
jsigs.use('jsonld', jsonld);
// test hashing function
api.testHasher = brLedgerNode.consensus._hasher;

api.addEvent = ({
  consensus = false, count = 1, eventTemplate, ledgerStorage, opTemplate,
  recordId, startBlockHeight = 1
}, callback) => {
  const events = {};
  let operations;
  async.timesSeries(count, (i, callback) => {
    const testEvent = bedrock.util.clone(eventTemplate);
    const operation = bedrock.util.clone(opTemplate);
    const testRecordId = recordId || `https://example.com/event/${uuid()}`;
    if(operation.type === 'CreateWebLedgerRecord') {
      operation.record.id = testRecordId;
    }
    if(operation.type === 'UpdateWebLedgerRecord') {
      operation.recordPatch.target = testRecordId;
    }
    async.auto({
      operationHash: callback => api.testHasher(operation, (err, opHash) => {
        if(err) {
          return callback(err);
        }

        // NOTE: nonce is added here to avoid duplicate errors
        testEvent.nonce = uuid();

        testEvent.operationHash = [opHash];
        callback(null, opHash);
      }),
      eventHash: ['operationHash', (results, callback) => api.testHasher(
        testEvent, callback)],
      operation: ['eventHash', (results, callback) => {
        const {eventHash, operationHash} = results;
        operations = [{
          meta: {
            eventHash: eventHash, eventOrder: 0, operationHash
          },
          operation,
          recordId: database.hash(testRecordId),
        }];
        ledgerStorage.operations.addMany({operations}, callback);
      }],
      event: ['operation', (results, callback) => {
        const {eventHash} = results;
        const meta = {eventHash};
        if(consensus) {
          const blockHeight = i + startBlockHeight;
          meta.blockHeight = blockHeight;
          meta.blockOrder = 0;
          meta.consensus = true;
          meta.consensusDate = Date.now();
        }
        ledgerStorage.events.add(
          {event: testEvent, meta}, (err, result) => {
            if(err) {
              return callback(err);
            }
            // NOTE: operations are added to events object in full here so they
            // may be inspected in tests. This does not represent the event
            // in the database
            result.operations = operations;
            events[result.meta.eventHash] = result;
            callback();
          });
      }]
    }, callback);
  }, err => callback(err, events));
};

api.createIdentity = function(userName, userId) {
  userId = userId || 'did:v1:' + uuid();
  const newIdentity = {
    id: userId,
    type: 'Identity',
    sysSlug: userName,
    label: userName,
    email: userName + '@bedrock.dev',
    sysPassword: 'password',
    sysPublic: ['label', 'url', 'description'],
    sysResourceRole: [],
    url: 'https://example.com',
    description: userName,
    sysStatus: 'active'
  };
  return newIdentity;
};

// collections may be a string or array
api.removeCollections = function(collections, callback) {
  const collectionNames = [].concat(collections);
  database.openCollections(collectionNames, () => {
    async.each(collectionNames, function(collectionName, callback) {
      if(!database.collections[collectionName]) {
        return callback();
      }
      database.collections[collectionName].remove({}, callback);
    }, function(err) {
      callback(err);
    });
  });
};

api.prepareDatabase = function(mockData, callback) {
  async.series([
    callback => {
      api.removeCollections([
        'identity', 'eventLog', 'ledger', 'ledgerNode'
      ], callback);
    },
    callback => {
      insertTestData(mockData, callback);
    }
  ], callback);
};

api.getEventNumber = function(eventId) {
  return Number(eventId.substring(eventId.lastIndexOf('/') + 1));
};

api.average = arr => Math.round(arr.reduce((p, c) => p + c, 0) / arr.length);

api.createBlocks = (
  {blockTemplate, eventTemplate, blockNum = 1, eventNum = 1}, callback) => {
  const blocks = [];
  const events = [];
  const startTime = Date.now();
  async.timesLimit(blockNum, 100, (i, callback) => {
    const block = bedrock.util.clone(blockTemplate);
    block.id = uuid();
    block.blockHeight = i + 1;
    block.previousBlock = uuid();
    block.previousBlockHash = uuid();
    const time = startTime + i;
    const meta = {
      blockHash: uuid(),
      created: time,
      updated: time,
      consensus: true,
      consensusDate: time
    };
    async.auto({
      events: callback => api.createEvent(
        {eventTemplate, eventNum}, (err, result) => {
          if(err) {
            return callback(err);
          }
          // must hash with the real events
          block.event = result.map(e => e.event);
          events.push(...result);
          callback(null, result);
        }),
      hash: ['events', (results, callback) => {
        api.testHasher(block, (err, result) => {
          if(err) {
            return callback(err);
          }
          meta.blockHash = result;
          // block is stored with the eventHashes
          block.event = results.events.map(e => e.meta.eventHash);
          blocks.push({block, meta});
          callback();
        });
      }]
    }, callback);
  }, err => {
    if(err) {
      return callback(err);
    }
    callback(null, {blocks, events});
  });
};

api.createEvent = ({eventTemplate, eventNum, consensus = true}, callback) => {
  const events = [];
  async.timesLimit(eventNum, 100, (i, callback) => {
    const event = bedrock.util.clone(eventTemplate);
    event.id = `https://example.com/events/${uuid()}`;
    // events.push(event);
    api.testHasher(event, (err, result) => {
      const meta = {eventHash: result};
      if(consensus) {
        meta.consensus = true;
        meta.consensusDate = Date.now();
      }
      events.push({event, meta});
      callback();
    });
  }, err => callback(err, events));
};

api.hasher = (data, callback) => callback(
  null, crypto.createHash('sha256').update(JSON.stringify(data)).digest());

// Insert identities and public keys used for testing into database
function insertTestData(mockData, callback) {
  async.forEachOf(mockData.identities, (identity, key, callback) => {
    brIdentity.insert(null, identity.identity, callback);
  }, err => {
    if(err) {
      if(!database.isDuplicateError(err)) {
        // duplicate error means test data is already loaded
        return callback(err);
      }
    }
    callback();
  }, callback);
}

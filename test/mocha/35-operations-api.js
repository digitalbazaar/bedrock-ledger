/*
 * Copyright (c) 2017-2018 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const async = require('async');
const brIdentity = require('bedrock-identity');
const brLedgerNode = require('bedrock-ledger-node');
const helpers = require('./helpers');
const mockData = require('./mock.data');
const {util: {uuid}} = require('bedrock');

let signedConfig;

describe('Operations API', () => {
  before(done => {
    async.series([
      callback => helpers.prepareDatabase(mockData, callback),
      callback => helpers.signDocument({
        doc: mockData.ledgerConfiguration,
        privateKeyPem: mockData.groups.authorized.privateKey,
        creator: 'did:v1:53ebca61-5687-4558-b90a-03167e4c2838/keys/144'
      }, (err, result) => {
        signedConfig = result;
        callback(err);
      })
    ], done);
  });
  beforeEach(done => {
    helpers.removeCollections('ledger_testLedger', done);
  });
  describe('regularUser as actor', () => {
    let actor;
    let ledgerNode;
    before(done => {
      async.auto({
        getActor: callback => {
          const {id} = mockData.identities.regularUser.identity;
          brIdentity.getCapabilities({id}, (err, result) => {
            actor = result;
            assertNoError(err);
            callback();
          });
        },
        addLedger: ['getActor', (results, callback) => brLedgerNode.add(
          actor, {ledgerConfiguration: signedConfig}, (err, result) => {
            ledgerNode = result;
            callback(err);
          })]
      }, done);
    });
    it('should add operation with optional creator', done => {
      const testOperation = {
        '@context': 'https://w3id.org/webledger/v1',
        type: 'CreateWebLedgerRecord',
        creator: 'https://example.com/someCreatorId',
        record: {
          '@context': 'https://schema.org/',
          id: 'urn:uuid:' + uuid(),
          value: uuid()
        }
      };
      async.auto({
        sign: callback => helpers.signDocument({
          doc: testOperation,
          privateKeyPem: mockData.groups.authorized.privateKey,
          creator: 'did:v1:53ebca61-5687-4558-b90a-03167e4c2838/keys/144'
        }, callback),
        add: ['sign', (results, callback) => {
          ledgerNode.operations.add({operation: results.sign}, err => {
            assertNoError(err);
            callback();
          });
        }]
      }, done);
    });
    it('should add operation without optional creator', done => {
      const testOperation = {
        '@context': 'https://w3id.org/webledger/v1',
        type: 'CreateWebLedgerRecord',
        // the optional creator is missing
        record: {
          '@context': 'https://schema.org/',
          id: 'urn:uuid:' + uuid(),
          value: uuid()
        }
      };
      async.auto({
        sign: callback => helpers.signDocument({
          doc: testOperation,
          privateKeyPem: mockData.groups.authorized.privateKey,
          creator: 'did:v1:53ebca61-5687-4558-b90a-03167e4c2838/keys/144'
        }, callback),
        add: ['sign', (results, callback) => {
          ledgerNode.operations.add({operation: results.sign}, err => {
            assertNoError(err);
            callback();
          });
        }]
      }, done);
    });
    it('should fail add operation with an incorrect context', done => {
      const testOperation = {
        '@context': 'https://w3id.org/test/v1',
        type: 'CreateWebLedgerRecord',
        creator: 'https://example.com/someCreatorId',
        record: {
          '@context': 'https://schema.org/',
          id: 'urn:uuid:' + uuid(),
          value: uuid()
        }
      };
      async.auto({
        sign: callback => helpers.signDocument({
          doc: testOperation,
          privateKeyPem: mockData.groups.authorized.privateKey,
          creator: 'did:v1:53ebca61-5687-4558-b90a-03167e4c2838/keys/144'
        }, callback),
        add: ['sign', (results, callback) => {
          ledgerNode.operations.add({operation: results.sign}, err => {
            err.name.should.equal('SyntaxError');
            err.message.should.equal(
              'Operation context must be "https://w3id.org/webledger/v1"');
            callback();
          });
        }]
      }, done);
    });
    it('should fail add operation with incorrect order of contexts', done => {
      const testOperation = {
        '@context': ['https://w3id.org/test/v1'],
        type: 'CreateWebLedgerRecord',
        creator: 'https://example.com/someCreatorId',
        record: {
          '@context': 'https://schema.org/',
          id: 'urn:uuid:' + uuid(),
          value: uuid()
        }
      };
      async.auto({
        sign: callback => helpers.signDocument({
          doc: testOperation,
          privateKeyPem: mockData.groups.authorized.privateKey,
          creator: 'did:v1:53ebca61-5687-4558-b90a-03167e4c2838/keys/144'
        }, callback),
        add: ['sign', (results, callback) => {
          ledgerNode.operations.add({operation: results.sign}, err => {
            err.name.should.equal('SyntaxError');
            err.message.should.equal('Operation context must contain ' +
              '"https://w3id.org/webledger/v1" as the first element.');
            callback();
          });
        }]
      }, done);
    });
    it('should get event containing the operation', done => {
      const testOperation = {
        '@context': 'https://w3id.org/webledger/v1',
        type: 'CreateWebLedgerRecord',
        creator: 'https://example.com/someCreatorId',
        record: {
          '@context': 'https://schema.org/',
          id: 'urn:uuid:' + uuid(),
          value: uuid()
        }
      };
      async.auto({
        sign: callback => helpers.signDocument({
          doc: testOperation,
          privateKeyPem: mockData.groups.authorized.privateKey,
          creator: 'did:v1:53ebca61-5687-4558-b90a-03167e4c2838/keys/144'
        }, callback),
        add: ['sign', (results, callback) =>
          ledgerNode.operations.add({operation: results.sign}, callback)],
        // unilateral consensus allows immediate retrieval of an event with
        // a single operation in it from the latest block
        get: ['add', (results, callback) => {
          ledgerNode.blocks.getLatest((err, result) => {
            assertNoError(err);
            should.exist(result);
            should.exist(result.eventBlock);
            should.exist(result.eventBlock.block);
            should.exist(result.eventBlock.block.event);
            const event = result.eventBlock.block.event[0];
            should.exist(event);
            should.exist(event.operation);
            should.exist(event.operation[0]);
            event.operation[0].should.deep.equal(results.sign);
            callback();
          });
        }]
      }, done);
    });
  });
});

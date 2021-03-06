/*!
 * Copyright (c) 2016-2021 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const database = require('bedrock-mongodb');

const api = {};
module.exports = api;

const COLLECTION_NAME = api.COLLECTION_NAME = 'ledgerNode_peer';

module.exports.init = async () => {
  await database.openCollections([COLLECTION_NAME]);
  await database.createIndexes([{
    collection: COLLECTION_NAME,
    fields: {
      'meta.ledgerNodeId': 1,
      'peer.id': 1
    },
    options: {unique: true, background: false}
  }, {
    collection: COLLECTION_NAME,
    fields: {
      'meta.ledgerNodeId': 1,
      'peer.reputation': -1,
      'peer.status.backoffUntil': 1,
      'peer.status.requiredBlockHeight': 1,
      'meta.updated': 1,
      'peer.status.lastPushAt': -1,
      'peer.status.consecutiveFailures': 1
    },
    options: {
      unique: false, background: false,
      name: `${COLLECTION_NAME}.reputation`,
    }
  }, {
    collection: COLLECTION_NAME,
    fields: {
      'meta.ledgerNodeId': 1,
      'peer.status.consecutiveFailures': 1,
      'peer.reputation': -1,
      'peer.status.backoffUntil': 1,
      'peer.status.requiredBlockHeight': 1,
      'meta.updated': 1,
      'peer.status.lastPushAt': -1
    },
    options: {
      unique: false, background: false,
      name: `${COLLECTION_NAME}.failures`
    }
  }, {
    collection: COLLECTION_NAME,
    fields: {
      'meta.ledgerNodeId': 1,
      'peer.id': 1,
      'meta.pulledAfterPush': 1
    },
    options: {
      unique: false, background: false,
      name: `${COLLECTION_NAME}.pushUpdates`,
      partialFilterExpression: {
        'meta.pulledAfterPush': true
      }
    }
  }]);
};

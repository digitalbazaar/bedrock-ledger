[![Build Status](https://ci.digitalbazaar.com/buildStatus/icon?job=bedrock-ledger)](https://ci.digitalbazaar.com/job/bedrock-ledger)

# Bedrock Ledger

A [bedrock][] module for the creation and management of decentralized ledgers.

## The Ledger API

* Ledger API
  * bLedger.create(actor, options, (err, ledgerNode))
  * bLedger.get(actor, options, (err, ledgerNode))
* Blocks API
  * ledgerNode.
* Events API
  * 


## Quick Examples

```
npm install bedrock-ledger bedrock-ledger-storage-mongodb bedrock-ledger-authz-signature
```

```js
const bLedger = require('bedrock-ledger');
require('bedrock-ledger-storage-mongodb');
require('bedrock-ledger-authz-signature');

const actor = 'admin';
const options = {
  ledgerId: 'did:v1:eb8c22dc-bde6-4315-92e2-59bd3f3c7d59',
  storage: 'mongodb',
  configBlock: {
    id: 'did:v1:eb8c22dc-bde6-4315-92e2-59bd3f3c7d59/blocks/1',
    type: 'WebLedgerConfigurationBlock',
    ledger: 'did:v1:eb8c22dc-bde6-4315-92e2-59bd3f3c7d59',
    consensusMethod: {
      type: 'Continuity2017'
    },
    configurationAuthorizationMethod: {
      type: 'ProofOfSignature2016',
      approvedSigner: [
        'did:v1:53ebca61-5687-4558-b90a-03167e4c2838/keys/144'
      ],
      minimumSignaturesRequired: 1
    },
    writeAuthorizationMethod: {
      type: 'ProofOfSignature2016',
      approvedSigner: [
        'did:v1:53ebca61-5687-4558-b90a-03167e4c2838/keys/144'
      ],
      minimumSignaturesRequired: 1
    },
    signature: {
      type: 'RsaSignature2017',
      created: '2017-10-24T05:33:31Z',
      creator: 'did:v1:53ebca61-5687-4558-b90a-03167e4c2838/keys/144',
      domain: 'example.com',
      signatureValue: 'eyiOiJJ0eXAK...EjXkgFWFO'
    }
  }
};

bLedger.create(actor, options, (err, ledgerNode) => {
  if(err) {
    throw new Error("Failed to create ledger:", err);
  }
  
  ledgerNode.events.create( /* create a new ledger event */);
  /* ... do other operations on the ledger */
});
```

## Configuration

For documentation on configuration, see [config.js](./lib/config.js).

## Ledger Node API

### Create a Ledger

Create a new ledger given a set of options to create the new
ledger. A Ledger Node API is returned that can then be used 
to operate on the ledger.

* actor - the actor performing the action.
* options - a set of options used when creating the ledger.
  * ledgerId (required) - the URI of the ledger.
  * storage (required) - the storage subsystem for the ledger.
  * configBlock (required) - the configuration block for the ledger.
* callback(err, ledger) - the callback to call when finished.
  * err - An Error if an error occurred, null otherwise
  * ledgerNode - A ledger node API that can be used to
    perform actions on the newly created ledger.

```javascript
const bLedger = require('bedrock-ledger');

const options = {
  ledgerId: 'did:v1:eb8c22dc-bde6-4315-92e2-59bd3f3c7d59',
  storage: 'mongodb',
  configBlock: {
    id: 'did:v1:eb8c22dc-bde6-4315-92e2-59bd3f3c7d59/blocks/1',
    type: 'WebLedgerConfigurationBlock',
    ledger: 'did:v1:eb8c22dc-bde6-4315-92e2-59bd3f3c7d59',
    consensusMethod: {
      type: 'Continuity2017'
    },
    configurationAuthorizationMethod: {
      type: 'ProofOfSignature2016',
      approvedSigner: [
        'did:v1:53ebca61-5687-4558-b90a-03167e4c2838/keys/144'
      ],
      minimumSignaturesRequired: 1
    },
    writeAuthorizationMethod: {
      type: 'ProofOfSignature2016',
      approvedSigner: [
        'did:v1:53ebca61-5687-4558-b90a-03167e4c2838/keys/144'
      ],
      minimumSignaturesRequired: 1
    },
    signature: {
      type: 'RsaSignature2017',
      created: '2017-10-24T05:33:31Z',
      creator: 'did:v1:53ebca61-5687-4558-b90a-03167e4c2838/keys/144',
      domain: 'example.com',
      signatureValue: 'eyiOiJJ0eXAK...EjXkgFWFO'
    }
  }
};

bLedger.create(actor, options, (err, ledgerNode) => {
  if(err) {
    throw new Error("Failed to create ledger:", err);
  }
  
  console.log("Ledger created", ledgerNode);
});
```

### Get a Ledger

Get an existing ledger node API given a set of options. 
A Ledger Node API is returned that can then be used 
to operate on the ledger.

* actor - the actor performing the action.
* options - a set of options used when creating the ledger.
  * ledgerId (required) - the URI of the ledger.
  * storage (required) - the storage subsystem for the ledger.
* callback(err, ledgerNode) - the callback to call when finished.
  * err - An Error if an error occurred, null otherwise
  * ledgerNode - A ledger node API that can be used to
    perform actions on the newly created ledger.

```javascript
const bLedger = require('bedrock-ledger');

const options = {
  ledgerId: 'did:v1:eb8c22dc-bde6-4315-92e2-59bd3f3c7d59';
  storage: 'mongodb'
};

bLedger.get(actor, options, (err, ledgerNode) => {
  if(err) {
    throw new Error('Failed to retrieve ledger node API:', err);
  }
  
  ledgerNode.events.create( /* create a new ledger event */);
});
```

### Delete a Ledger

Delete an existing ledger given a set of options.

* actor - the actor performing the action.
* options - a set of options used when deleting the ledger.
* callback(err) - the callback to call when finished.
  * err - An Error if an error occurred, null otherwise

```javascript
const options = {};

ledgerNode.delete(actor, options, err => {
  if(err) {
    throw new Error('Failed to delete ledger:', err);
  }
  
  console.log('Ledger deleted.');
});
```

## Blocks API

### Get a Ledger Block

Gets a block from the ledger given a blockID and a set of options.

* actor - the actor performing the action.
* blockId - the URI of the block to fetch.
* options - a set of options used when retrieving the block.
* callback(err) - the callback to call when finished.
  * err - An Error if an error occurred, null otherwise.

```javascript
const blockId = 'did:v1:eb8c22dc-bde6-4315-92e2-59bd3f3c7d59/blocks/1';
const options = {};

ledgerNode.blocks.get(actor, blockId, options, (err, block) => {
  if(err) {
    throw new Error("Block retrieval failed:", err);
  }
  
  console.log("Retrieved block:", blocks);
});
```

## Events API

### Create a Ledger Event

Creates an event to associate with a ledger given an 
event and a set of options.

* actor - the actor performing the action.
* event - the event to associate with a ledger.
* options - a set of options used when creating the event.
* callback(err) - the callback to call when finished.
  * err - An Error if an error occurred, null otherwise.

```javascript
const actor = 'admin';
const event = {
  '@context': 'https://schema.org/',
  type: 'Event',
  name: 'Big Band Concert in New York City',
  startDate: '2017-07-14T21:30',
  location: 'https://example.org/the-venue',
  offers: {
    type: 'Offer',
    price: '13.00',
    priceCurrency: 'USD',
    url: 'https://www.ticketfly.com/purchase/309433'
  },
  signature: {
    type: 'RsaSignature2017',
    created: '2017-05-10T19:47:15Z',
    creator: 'https://www.ticketfly.com/keys/789',
    signatureValue: 'JoS27wqa...BFMgXIMw=='
  }
}
const options = {};

ledgerNode.events.create(actor, event, options, (err, event) => {
  if(err) {
    throw new Error("Failed to create the event:", err);
  }
  
  console.log('Event creation successful:', event.id);
});
```

### Get a Ledger Event

Gets an event associated with the ledger given an eventID
and a set of options.

* actor - the actor performing the action.
* eventId - the event to fetch from the ledger.
* options - a set of options used when retrieving the event.
* callback(err) - the callback to call when finished.
  * err - An Error if an error occurred, null otherwise.

```javascript
const eventId = 'did:v1:eb8c22dc-bde6-4315-92e2-59bd3f3c7d59/events/76b17d64-abb1-4d19-924f-427a743489f0';

ledgerNode.events.get(actor, eventId, options, (err, event) => {
  if(err) {
    throw new Error('Event retrieval failed:', err);
  }
  
  console.log('Event retrieval successful:', events);
});
```

## Metadata API

Gets metadata associated with the ledger given a set of options.

* actor - the actor performing the action.
* options - a set of options used when retrieving the ledger metadata.
* callback(err) - the callback to call when finished.
  * err - An Error if an error occurred, null otherwise.

```javascript
ledgerNode.meta.get(actor, options, (err, ledger) => {
  if(err) {
    throw new Error('Ledger metadata retrieval failed:', err);
  }
  
  console.log('Ledger metadata:', ledger);
});
```

### Ledger Plugin Registration API

Enables plugins to register with the ledger such that they may be
used to extend the capabilities of the ledger subsystem by adding
new storage, consensus, and authorization mechanisms.

* options - a set of options used when retrieving the ledger metadata.
* callback(err) - the callback to call when finished.
  * err - An Error if an error occurred, null otherwise.

```javascript
// this code would be executed in a plugin
const bLedger = require('bedrock-ledger');

bLedger.use('storage', 'mongodb', mongodbStorageApi);
```

[bedrock]: https://github.com/digitalbazaar/bedrock

const saito = require('../saito');



/////////////////
// Constructor //
/////////////////
function Keys(app) {

  if (!(this instanceof Keys)) {
    return new Keys(app);
  }

  this.app         = app || {};
  this.keys        = [];

  return this;
  
}
module.exports = Keys;


////////////////
// initialize //
////////////////
Keys.prototype.initialize = function initialize() {

  if (this.app.options.keys == null) { this.app.options.keys = {}; }

  for (let i = 0; i < this.app.options.keys.length; i++) {
    var tk               = this.app.options.keys[i];

    var k                = new saito.key();
        k.publickey      = tk.publickey;
        k.watched        = tk.watched;
        k.aes_publickey  = tk.aes_publickey;
        k.aes_privatekey = tk.aes_privatekey;
        k.aes_secret     = tk.aes_secret;
        k.identifiers    = [];
        k.tags           = [];

        for (let m = 0; m < tk.identifiers.length; m++) {
 	  k.identifiers[m] = tk.identifiers[m];
        }
        for (let m = 0; m < tk.tags.length; m++) {
 	  k.tags[m] = tk.tags[m];
        }
    this.keys.push(k);
  }


}


////////////
// addKey //
////////////
//
// this can also add identifiers and kes to existing keys
//
// it can upgrade keys to "watched" status but not downgrade watched keys.
//
Keys.prototype.addKey = function addKey(publickey, identifier = "", watched = 0, tag = "") {

  if (publickey == "") { return; }

  let tmpkey = this.findByPublicKey(publickey);
  if (tmpkey == null) {
    tmpkey                = new saito.key();
    tmpkey.publickey      = publickey;
    tmpkey.watched        = watched;
    if (identifier != "") { tmpkey.addIdentifier(identifier); }
    if (tag != "")        { tmpkey.addTag(tag); }
    this.keys.push(tmpkey);
  } else {
    if (identifier != "") { tmpkey.addIdentifier(identifier); }
    if (tag != "")        { tmpkey.addTag(tag); }
    if (watched == 1) { tmpkey.watched = 1; }
  }
  this.saveKeys();
}


////////////////////
// decryptMessage //
////////////////////
//
// decrypts a message if a shared secret exists
// for the associated public key.
//
// @params {string} publickey
// @params {string} message
//
Keys.prototype.decryptMessage = function decryptMessage(publickey, msg) {

console.log("looking to decrypt for key: " + publickey);

  // submit JSON parsed object after unencryption
  for (let x = 0; x < this.keys.length; x++) {
console.log("           this key: " + this.keys[x].publickey);
    if (this.keys[x].publickey == publickey) {
console.log("              this secret: " + this.keys[x].aes_secret);
      if (this.keys[x].aes_secret != "") {
console.log("decrypting with key: " + this.keys[x].aes_secret);
        var tmpmsg = this.app.crypt.aesDecrypt(msg, this.keys[x].aes_secret);
        if (tmpmsg != null) {
          var tmpx = JSON.parse(tmpmsg);
          if (tmpx.module != null) {
console.log("decrypting success! returning tmpmsg");
console.log(tmpmsg);
            return JSON.parse(tmpmsg);
          }
        }
      }
    }
  }

  // or return the original
  return msg;
}


///////////////////
// decryptString //
///////////////////
//
// decrypts a string if a shared secret exists
// for the associated public key.
//
// @params {string} publickey
// @params {string} message
//
Keys.prototype.decryptString = function decryptString(publickey, msg) {

  // submit JSON parsed object after unencryption
  for (let x = 0; x < this.keys.length; x++) {
    if (this.keys[x].publickey == publickey) {
      if (this.keys[x].aes_secret != "") {
        var tmpmsg = this.app.crypt.aesDecrypt(msg, this.keys[x].aes_secret);
        return tmpmsg;
      }
    }
  }

  // or return the original
  return msg;
}


////////////////////
// encryptMessage //
////////////////////
//
// encrypts a message if a shared secret exists
// for the associated public key.
//
// @params {string} publickey
// @params {string} message
//
Keys.prototype.encryptMessage = function encryptMessage(publickey, msg) {

  // turn submitted msg object into JSON and then encrypt it, or
  // return the original unencrypted object
  var jsonmsg = JSON.stringify(msg);

  for (let x = 0; x < this.keys.length; x++) {
    if (this.keys[x].publickey == publickey) {
      if (this.keys[x].aes_secret != "") {
        return this.app.crypt.aesEncrypt(jsonmsg, this.keys[x].aes_secret);
      }
    }
  }

  return msg;
}


/////////////////////
// findByPublicKey //
/////////////////////
//
// return the key associated with this public key
//
// @params {string} public key
//
Keys.prototype.findByPublicKey = function findByPublicKey(publickey) {
console.log(JSON.stringify(this.keys));
  for (let x = 0; x < this.keys.length; x++) {
    if (this.keys[x].publickey == publickey) { return this.keys[x]; }
  }
  return null;
}


//////////////////////
// findByIdentifier //
//////////////////////
//
// returns the key associated with the identifier, or null
//
// @params {string} identifier
//
Keys.prototype.findByIdentifier = function findByIdentifier(identifier) {
  for (let x = 0; x < this.keys.length; x++) {
    if (this.keys[x].isIdentifier(identifier) == 1) { return this.keys[x]; }
  }
  return null;
}


/////////////////////
// hasSharedSecret //
/////////////////////
//
// returns 1 if we have a shared secret with this public key
//
// @params {string} public key
//
Keys.prototype.hasSharedSecret = function hasSharedSecret(publickey) {
  for (let x = 0; x < this.keys.length; x++) {
    if (this.keys[x].publickey == publickey || this.keys[x].isIdentifier(publickey) == 1) {
      if (this.keys[x].hasSharedSecret() == 1) {
        return 1;
      }
    }
  }
  return 0;
}


///////////////
// isWatched //
///////////////
//
// returns 1 if we are watching this key
//
// @params {string} public key
//
Keys.prototype.isWatched = function isWatched(publickey) {
  for (let x = 0; x < this.keys.length; x++) {
    if (this.keys[x].publickey == publickey || this.keys[x].isIdentifier(publickey) == 1) {
      if (this.keys[x].isWatched() == 1) {
        return 1;
      }
    }
  }
  return 0;
}


///////////////////////////
// initializeKeyExchange //
///////////////////////////
//
// return publickey of alice in key exchange diffie-hellman
//
// @params {string} public key
// @returns (string) public key
//
Keys.prototype.initializeKeyExchange = function initializeKeyExchange(publickey) {

  var alice            = this.app.crypt.createDiffieHellman();
  var alice_publickey  = alice.getPublicKey(null, "compressed").toString("hex");
  var alice_privatekey = alice.getPrivateKey(null, "compressed").toString("hex");
  this.updateCryptoByPublicKey(publickey, alice_publickey, alice_privatekey, "");
  return alice_publickey;

}


//////////////
// isTagged //
//////////////
//
// returns 1 if this public key is tagged with this key
//
// @params {string} public key
// @params {string} tag
//
Keys.prototype.isTagged = function isTagged(publickey, tag) {
  var x = this.findByPublicKey(publickey);
  if (x == null) { return 0; }
  return x.isTagged(tag);
}


//////////////
// saveKeys //
//////////////
//
// saves keys into options file
//
Keys.prototype.saveKeys = function saveKeys() {
  this.app.options.keys = this.returnKeys();
  this.app.storage.saveOptions();
}


///////////////
// removeKey //
///////////////
//
// remove key from array of keys
//
Keys.prototype.removeKey = function removeKey(publickey) {
  for (let x = this.keys.length-1; x >= 0; x--) {
    if (this.keys[x].publickey == publickey) {
      this.keys.splice(x, 1);
    }
  }
}


/////////////////////////////////////
// removeKeyByidentifierAndKeyword //
/////////////////////////////////////
//
// remove key from array of keys by identifier and tag
//
Keys.prototype.removeKeyByIdentifierAndKeyword = function removeKeywordByIdentifierAndKeyword(identifier, tag) {
  for (let x = this.keys.length-1; x >= 0; x--) {
    if (this.keys[x].isIdentifier(identifier) && this.keys[x].isTagged(tag)) {
      this.removeKey(this.keys[x].publickey);
      return;
    }
  }
}


/////////////////////
// returnKeysByTag //
/////////////////////
//
// remove key from array of keys by identifier and tag
//
Keys.prototype.returnKeysByTag = function returnKeysByTag(tag) {
  var kx = [];
  for (let x = 0; x < this.keys.length; x++) {
    if (this.keys[x].isTagged(tag) == 1) { kx[kx.length] = this.keys[x]; }
  }
  return kx;
}


////////////////
// returnKeys //
////////////////
//
// returns keys
//
// @params {saito.keys} key array
//
Keys.prototype.returnKeys = function returnKeys() {
  return this.keys;
}


/////////////////////////////////
// returnPublicKeyByIdentifier //
/////////////////////////////////
//
// return public key by identifier
//
Keys.prototype.returnPublicKeyByIdentifier = function returnPublicKeyByIdentifier(identifier) {
  for (let x = 0; x < this.keys.length; x++) {
    if (this.keys[x].isIdentifier(identifier) == 1) { return this.keys[x].publickey; }
  }
  return "";
}


/////////////////////////////
// returnWatchedPublicKeys //
/////////////////////////////
//
// returns the public keys we are watching
//
// @returns {array} public keys
//
Keys.prototype.returnWatchedPublicKeys = function returnWatchedPublicKeys() {
  var x = [];
  for (let i = 0; i < this.keys.length; i++) {
    if (this.keys[i].isWatched() == 1) {
      x.push(this.keys[i].publickey);
    }
  }
  return x;
}


/////////////////////////////
// updateCryptoByPublicKey //
/////////////////////////////
//
// update the pubkey / privkey / aes secret by publickey
//
Keys.prototype.updateCryptoByPublicKey = function updateCryptoByPublicKey(publickey, aes_publickey = "", aes_privatekey = "", shared_secret = "") {

  if (publickey == "") { return; }

  this.addKey(publickey);

  for (let x = 0; x < this.keys.length; x++) {
    if (this.keys[x].publickey == publickey) {
      this.keys[x].aes_publickey  = aes_publickey;
      this.keys[x].aes_privatekey = aes_privatekey;
      this.keys[x].aes_secret     = shared_secret;
    }
  }

  this.saveKeys();

  return 0;
}


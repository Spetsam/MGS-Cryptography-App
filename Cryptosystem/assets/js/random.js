/**
 * All code is in an anonymous closure to keep the global namespace clean.
 *
 * @param {number=} overflow
 * @param {number=} startdenom
 */
(function (pool, math, width, chunks, significance, overflow, startdenom) {
  math["seedrandom"] = function seedrandom(seed, use_entropy) {
    var key = [];
    var arc4;

    seed = mixkey(
      flatten(
        use_entropy
          ? [seed, pool]
          : arguments.length
          ? seed
          : [new Date().getTime(), pool, window],
        3
      ),
      key
    );

    arc4 = new ARC4(key);

    mixkey(arc4.S, pool);

    math["random"] = function random() {
      var n = arc4.g(chunks);
      var d = startdenom;
      var x = 0;
      while (n < significance) {
        n = (n + x) * width;
        d *= width;
        x = arc4.g(1);
      }
      while (n >= overflow) {
        n /= 2;
        d /= 2;
        x >>>= 1;
      }
      return (n + x) / d;
    };

    return seed;
  };

  /** @constructor */

  function ARC4(key) {
    var t,
      u,
      me = this,
      keylen = key.length;
    var i = 0,
      j = (me.i = me.j = me.m = 0);
    me.S = [];
    me.c = [];

    if (!keylen) {
      key = [keylen++];
    }

    while (i < width) {
      me.S[i] = i++;
    }
    for (i = 0; i < width; i++) {
      t = me.S[i];
      j = lowbits(j + t + key[i % keylen]);
      u = me.S[j];
      me.S[i] = u;
      me.S[j] = t;
    }

    me.g = function getnext(count) {
      var s = me.S;
      var i = lowbits(me.i + 1);
      var t = s[i];
      var j = lowbits(me.j + t);
      var u = s[j];
      s[i] = u;
      s[j] = t;
      var r = s[lowbits(t + u)];
      while (--count) {
        i = lowbits(i + 1);
        t = s[i];
        j = lowbits(j + t);
        u = s[j];
        s[i] = u;
        s[j] = t;
        r = r * width + s[lowbits(t + u)];
      }
      me.i = i;
      me.j = j;
      return r;
    };
    me.g(width);
  }

  /** @param {Object=} result
   * @param {string=} prop
   * @param {string=} typ */

  function flatten(obj, depth, result, prop, typ) {
    result = [];
    typ = typeof obj;
    if (depth && typ == "object") {
      for (prop in obj) {
        if (prop.indexOf("S") < 5) {
          try {
            result.push(flatten(obj[prop], depth - 1));
          } catch (e) {}
        }
      }
    }
    return result.length ? result : obj + (typ != "string" ? "\0" : "");
  }

  //
  // mixkey()
  // Mixes a string seed into a key that is an array of integers, and
  // returns a shortened string seed that is equivalent to the result key.
  //
  /** @param {number=} smear
   * @param {number=}  */

  function mixkey(seed, key, smear, j) {
    seed += "";
    smear = 0;
    for (j = 0; j < seed.length; j++) {
      key[lowbits(j)] = lowbits(
        (smear ^= key[lowbits(j)] * 19) + seed.charCodeAt(j)
      );
    }
    seed = "";
    for (j in key) {
      seed += String.fromCharCode(key[j]);
    }
    return seed;
  }
  function lowbits(n) {
    return n & (width - 1);
  }
  startdenom = math.pow(width, chunks);
  significance = math.pow(2, significance);
  overflow = significance * 2;
  mixkey(math.random(), pool);
})([], Math, 256, 6, 52);

function SeededRandom() {}

function SRnextBytes(ba) {
  var i;
  for (i = 0; i < ba.length; i++) {
    ba[i] = Math.floor(Math.random() * 256);
  }
}

SeededRandom.prototype.nextBytes = SRnextBytes;

function Arcfour() {
  this.i = 0;
  this.j = 0;
  this.S = new Array();
}

function ARC4init(key) {
  var i, j, t;
  for (i = 0; i < 256; ++i) this.S[i] = i;
  j = 0;
  for (i = 0; i < 256; ++i) {
    j = (j + this.S[i] + key[i % key.length]) & 255;
    t = this.S[i];
    this.S[i] = this.S[j];
    this.S[j] = t;
  }
  this.i = 0;
  this.j = 0;
}

function ARC4next() {
  var t;
  this.i = (this.i + 1) & 255;
  this.j = (this.j + this.S[this.i]) & 255;
  t = this.S[this.i];
  this.S[this.i] = this.S[this.j];
  this.S[this.j] = t;
  return this.S[(t + this.S[this.i]) & 255];
}

Arcfour.prototype.init = ARC4init;
Arcfour.prototype.next = ARC4next;

function prng_newstate() {
  return new Arcfour();
}

var rng_psize = 256;

var rng_state;
var rng_pool;
var rng_pptr;

function rng_seed_int(x) {
  rng_pool[rng_pptr++] ^= x & 255;
  rng_pool[rng_pptr++] ^= (x >> 8) & 255;
  rng_pool[rng_pptr++] ^= (x >> 16) & 255;
  rng_pool[rng_pptr++] ^= (x >> 24) & 255;
  if (rng_pptr >= rng_psize) rng_pptr -= rng_psize;
}

function rng_seed_time() {
  rng_seed_int(new Date().getTime());
}

if (rng_pool == null) {
  rng_pool = new Array();
  rng_pptr = 0;
  var t;
  if (
    navigator.appName == "Netscape" &&
    navigator.appVersion < "5" &&
    window.crypto
  ) {
    var z = window.crypto.random(32);
    for (t = 0; t < z.length; ++t) rng_pool[rng_pptr++] = z.charCodeAt(t) & 255;
  }
  while (rng_pptr < rng_psize) {
    t = Math.floor(65536 * Math.random());
    rng_pool[rng_pptr++] = t >>> 8;
    rng_pool[rng_pptr++] = t & 255;
  }
  rng_pptr = 0;
  rng_seed_time();
}

function rng_get_byte() {
  if (rng_state == null) {
    rng_seed_time();
    rng_state = prng_newstate();
    rng_state.init(rng_pool);
    for (rng_pptr = 0; rng_pptr < rng_pool.length; ++rng_pptr)
      rng_pool[rng_pptr] = 0;
    rng_pptr = 0;
  }

  return rng_state.next();
}

function rng_get_bytes(ba) {
  var i;
  for (i = 0; i < ba.length; ++i) ba[i] = rng_get_byte();
}

function SecureRandom() {}

SecureRandom.prototype.nextBytes = rng_get_bytes;
export default random;

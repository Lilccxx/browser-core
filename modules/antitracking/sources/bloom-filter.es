import md5 from '../core/helpers/md5';
import * as datetime from './time';
import pacemaker from '../core/pacemaker';
import QSWhitelistBase from './qs-whitelist-base';
import { utils } from '../core/cliqz';
import { Resource } from '../core/resource-loader';
import console from '../core/console';
import extConfig from '../core/config';


export function BloomFilter(a, k) {  // a the array, k the number of hash function
  var m = a.length * 32,  // 32 bits for each element in a
      n = a.length,
      i = -1;
  this.m = m = n * 32;
  this.k = k;
  // choose data type
  var kbytes = 1 << Math.ceil(Math.log(Math.ceil(Math.log(m) / Math.LN2 / 8)) / Math.LN2),
      array = kbytes === 1 ? Uint8Array : kbytes === 2 ? Uint16Array : Uint32Array,
      kbuffer = new ArrayBuffer(kbytes * k),
      buckets = this.buckets = new Int32Array(n);
  while (++i < n) {
    buckets[i] = a[i];  // put the elements into their bucket
  }
  this._locations = new array(kbuffer);  // stores location for each hash function
}

BloomFilter.prototype.locations = function(a, b) {  // we use 2 hash values to generate k hash values
  var k = this.k,
      m = this.m,
      r = this._locations;
  a = parseInt(a, 16);
  b = parseInt(b, 16);
  var x = a % m;

  for (var i = 0; i < k; ++i) {
    r[i] = x < 0 ? (x + m) : x;
    x = (x + b) % m;
  }
  return r;
};

BloomFilter.prototype.test = function(a, b) {
  // since MD5 will be calculated before hand,
  // we allow using hash value as input to

  var l = this.locations(a, b),
      k = this.k,
      buckets = this.buckets;
  for (var i = 0; i < k; ++i) {
    var bk = l[i];
    if ((buckets[Math.floor(bk / 32)] & (1 << (bk % 32))) === 0) {
      return false;
    }
  }
  return true;
};

BloomFilter.prototype.testSingle = function(x) {
  var md5Hex = md5(x);
  var a = md5Hex.substring(0, 8),
      b = md5Hex.substring(8, 16);
  return this.test(a, b);
};

BloomFilter.prototype.add = function(a, b) {
  // Maybe used to add local safeKey to bloom filter
  var l = this.locations(a, b),
      k = this.k,
      buckets = this.buckets;
  for (var i = 0; i < k; ++i) {
    buckets[Math.floor(l[i] / 32)] |= 1 << (l[i] % 32);
  }
};

BloomFilter.prototype.addSingle = function(x) {
  var md5Hex = md5(x);
  var a = md5Hex.substring(0, 8),
      b = md5Hex.substring(8, 16);
  return this.add(a, b);
};

BloomFilter.prototype.update = function(a) {
  // update the bloom filter, used in minor revison for every 10 min
  var m = a.length * 32,  // 32 bit for each element
      n = a.length,
      i = -1;
  m = n * 32;
  if (this.m !== m) {
    throw 'Bloom filter can only be updated with same length';
  }
  while (++i < n) {
    this.buckets[i] |= a[i];
  }
};


const BLOOMFILTER_BASE_URL = `${extConfig.settings.CDN_BASEURL}/anti-tracking/bloom_filter/`;
const BLOOMFILTER_CONFIG = `${extConfig.settings.CDN_BASEURL}/anti-tracking/bloom_filter/config`;

const UPDATE_EXPIRY_HOURS = 48;

export class AttrackBloomFilter extends QSWhitelistBase {

  constructor(config, configURL = BLOOMFILTER_CONFIG, baseURL = BLOOMFILTER_BASE_URL) {
    super(config);
    this.lastUpdate = '0';
    this.bloomFilter = null;
    this.version = null;
    this.configURL = configURL;
    this.baseURL = baseURL;
    this._config = new Resource(['antitracking', 'bloom_config.json'], {
      remoteURL: configURL
    });
  }

  init() {
    // check every 10min
    pacemaker.register(this.update.bind(this), 10 * 60 * 1000);
    const initPromises = [];
    initPromises.push(super.init());
    // if we already have a bloomFilter, leave the update to this.update
    if (!this.bloomFilter) {
      // To make the start up fast, we try to take local copy first
      // and then mock the config file with current date
      const dt = datetime.getTime();
      const major = `${dt.substr(0, 4)}-${dt.substr(4, 2)}-${dt.substr(6, 2)}`;
      const minor = 0;
      const bloomFile = new Resource(['antitracking', 'bloom_filter.json'], {
        remoteOnly: true // ignore chrome url
      });
      const loadBloomFile = () => bloomFile.load()
        .then(bf => this.updateFilter(bf, 'local', minor))
        .catch(() => {
          bloomFile.remoteURL = `${this.baseURL}${major}/${minor}.gz`;
          return bloomFile.updateFromRemote()
            .then(bf => this.updateFilter(bf, major, minor))
        }).catch(() => this.update())
      initPromises.push(loadBloomFile());
    }

    return Promise.all(initPromises);
  }

  destroy() {
    super.destroy();
  }

  isUpToDate() {
    var delay = UPDATE_EXPIRY_HOURS,
        hour = datetime.newUTCDate();
    hour.setHours(hour.getHours() - delay);
    var hourCutoff = datetime.hourString(hour);
    return this.lastUpdate > hourCutoff;
  }

  isReady() {
    return this.bloomFilter !== null;
  }

  isTrackerDomain(domain) {
    if (!this.isReady()) {
      return false;
    }
    return this.bloomFilter.testSingle('d' + domain);
  }

  isSafeKey(domain, key) {
    if (!this.isReady()) {
      return true;
    }
    return (!this.isUnsafeKey(domain, key)) && (this.bloomFilter.testSingle('k' + domain + key) || super.isSafeKey(domain, key));
  }

  isSafeToken(domain, token) {
    if (!this.isReady()) {
      return true;
    }
    return this.bloomFilter.testSingle('t' + domain + token);
  }

  isUnsafeKey(domain, token) {
    if (!this.isReady()) {
      return false;
    }
    return this.bloomFilter.testSingle('u' + domain + token);
  }

  addDomain(domain) {
    if (!this.isReady()) {
      return;
    }
    this.bloomFilter.addSingle('d' + domain);
  }

  addSafeKey(domain, key, valueCount) {
    if (!this.isReady()) {
      return;
    }
    if (this.isUnsafeKey(domain, key)) {
      return;
    }
    this.bloomFilter.addSingle('k' + domain + key);
    super.addSafeKey(domain, key, valueCount);
  }

  addUnsafeKey(domain, token) {
    if (!this.isReady()) {
      return;
    }
    this.bloomFilter.addSingle('u' + domain + token);
  }

  addSafeToken(domain, token) {
    if (!this.isReady()) {
      return;
    }
    if (token === '') {
      this.addDomain(domain);
    } else {
      this.bloomFilter.addSingle('t' + domain + token);
    }
  }

  getVersion() {
    return {
      bloomFilterversion: this.bloomFilter ? this.bloomFilter.version : null
    };
  }

  update() {
    return this._config.updateFromRemote().then(this.checkUpdate.bind(this)).then(() => {
      this.lastUpdate = datetime.getTime();
    }, e => console.log('unable to check bloom filter config (no network?)', e));
  }

  updateFilter(bf, major, minor) {
    if (minor !== 0) {
        this.bloomFilter.update(bf.bkt);
    } else {
        this.bloomFilter = new BloomFilter(bf.bkt, bf.k);
    }
    this.version = {
      major,
      minor
    };
    return Promise.resolve();
  }

  remoteUpdate(major, minor) {
    var url = this.baseURL + major + '/' + minor + '.gz';

    // load the filter, if possible from the CDN, otherwise grab a cached local version
    if (major === 'local') {
      return this.loadFromLocal().then(bf => this.updateFilter(bf, major, minor));
    } else if (minor === 0) {
      const bloomFile = new Resource(['antitracking', 'bloom_filter.json'], {
        remoteURL: url
      });
      return bloomFile.updateFromRemote()
        .catch(() => this.loadFromLocal())
        .then(bf => this.updateFilter(bf, major, minor));
    } else {
      return utils.promiseHttpHandler('GET', url, undefined, 10000)
        .then((req) => JSON.parse(req.response))
        .catch(() => this.loadFromLocal())
        .then(bf => this.updateFilter(bf, major, minor));
    }
  }

  loadFromLocal() {
    const bloomFile = new Resource(['antitracking', 'bloom_filter.json']);
    return bloomFile.load()
  }

  checkUpdate(version) {
    if (version === undefined) {
      return Promise.reject('version undefined');
    }
    var self = this;
    if (self.version === null || self.bloomFilter === null) {  // load the first time
      self.version = {'major': null, 'minor': null};
      return self.remoteUpdate(version.major, 0); // load the major version and update later
    }
    if (self.version.major === version.major &&
      self.version.minor === version.minor) {  // already at the latest version
      return Promise.resolve();
    }
    if (self.version.major !== version.major) {
      return self.remoteUpdate(version.major, 0);
    } else {
      return self.remoteUpdate(version.major, version.minor);
    }
  }
}

import { isChromium } from '../core/platform';

var OffersConfigs = {

  //////////////////////////////////////////////////////////////////////////////
  // GLOBAL
  MINUTE: 60,
  HOUR: 60 * 60,
  DAY: 60 * 60 * 24,

  CURRENT_VERSION: 2.0,

  LOG_LEVEL: 'off',
  LOG_ENABLED: false,

  //////////////////////////////////////////////////////////////////////////////
  // trigger backend endpoint
  BACKEND_URL: 'https://offers-api.cliqz.com',

  // the redirect url to where we should point to when the user sees the offer
  // and click on "more info"
  OFFER_INFORMATION_URL: 'https://cliqz.com/products/cliqz-for-desktop/cliqz-angebote',

  // the time we want to track the signals after they were created
  OFFERS_HISTORY_LIVE_TIME_SECS: 20 * 60 * 24 * 60,

  // trigger specific browser history
  LOAD_TRIGGER_HISTORY_DATA: true,
  TRIGGER_HISTORY_DATA: isChromium ? undefined : 'chrome://cliqz/content/offers-v2/trigger_history.json',
  // the current trigger engine version
  TRIGGER_ENGINE_VERSION: '5',

  // offer storage
  LOAD_OFFERS_STORAGE_DATA: true,
  OFFERS_STORAGE_DEFAULT_TTS_SECS: 60 * 60 * 24 * 10,
  OFFERS_STORAGE_AUTOSAVE_FREQ_SECS: 2 * 60,

  //////////////////////////////////////////////////////////////////////////////
  // SIGNALS

  // how often we want to send the signals related with the offers to the BE
  // ten minutes
  SIGNALS_OFFERS_FREQ_SECS: 30,
  SIGNALS_HPN_BE_ADDR: 'https://offers-api.cliqz.com/api/v1/savesignal',
  SIGNALS_HPN_BE_ACTION: 'offers-signal',
  // the time we want to keep the signals (accumulating) from the last time
  // the signal was modified (#GR-298)
  SIGNALS_OFFERS_EXPIRATION_SECS: 60 * 60 * 24 * 60, //60 days?
  // the version number of the signal structure we are currently using
  SIGNALS_VERSION: 3.1,
  // debug variable to load / not load the data from DB
  SIGNALS_LOAD_FROM_DB: true,
  // how frequent we want to save into DB
  SIGNALS_AUTOSAVE_FREQ_SECS: 2 * 60,
  // maximum number of retries sending a signal
  MAX_RETRIES: 3,

  // adding configs values for the send_signal operation (EX-4976)
  SEND_SIG_OP_AUTOSAVE_FREQ_SECS: 2 * 60,
  SEND_SIG_OP_EXPIRATION_SECS: 60 * 60 * 24 * 60, //60 days?
  SEND_SIG_OP_SHOULD_LOAD: true,

  // conf for trigger history database
  TRIGGER_HISTORY_OP_AUTOSAVE_FREQ_SECS: 2 * 60,
  TRIGGER_HISTORY_MAX_RECORDS: 1000,

  //////////////////////////////////////////////////////////////////////////////
  // QUERY HANDLER
  // how frequent we want to save query data into DB
  QUERY_HANDLER_AUTOSAVE_FREQ_SECS: 10 * 60,
  // debug variable to load / not load the data from DB
  QUERY_POSTINGS_LOAD_FROM_DB: true,
  POSTING_SLICE: 20,
  //////////////////////////////////////////////////////////////////////////////
  // CONFIG / DEBUG variables
  //

  // override the timeout time of the offers only if this is > 0
  OFFERS_OVERRIDE_TIMEOUT: -1

};


export default OffersConfigs;

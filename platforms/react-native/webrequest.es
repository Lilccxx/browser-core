// import { utils } from "../core/cliqz";
import bridge from './native-bridge';

const webRequest = {
  onBeforeRequest: {
    listeners: [],
    addListener(listener, filter, extraInfo) {
      this.listeners.push({fn: listener, filter, extraInfo});
    },
    removeListener(listener) {
      const ind = this.listeners.findIndex((l) => {
        return l.fn === listener;
      });
      if (ind > -1) {
        this.listeners.splice(ind, 1);
      }
    },

    _triggerJson(requestInfoJson) {
      const requestInfo = JSON.parse(requestInfoJson);
      try {
          const response = webRequest.onBeforeRequest._trigger(requestInfo) || {};
          return JSON.stringify(response);
      } catch(e) {
        console.error('webrequest trigger error', e);
      }
    },

    _trigger(requestInfo) {
      requestInfo.sourceUrl = requestInfo.source;
      // getter for request headers
      requestInfo.getRequestHeader = function(header) {
        return requestInfo.requestHeaders[header];
      };
      const blockingResponse = this.listeners.map(listener => {
        const {fn, filter, extraInfo} = listener;
        if (extraInfo.indexOf('blocking') === -1) {
          // non blocking listener, run async
          setTimeout(fn.bind(undefined, requestInfo), 0);
          return {}
        }
        return fn(requestInfo);
      }).reduce((acc, val) => {
        Object.keys(val).forEach(k => {
          acc[k] = val[k];
        });
        return acc;
      }, {});
      return blockingResponse;
    }
  },

  onBeforeSendHeaders: {
    addListener(listener, filter, extraInfo) {},
    removeListener(listener) {}
  },

  onHeadersReceived: {
    addListener(listener, filter, extraInfo) {},
    removeListener(listener) {}
  }
}

bridge.registerAction('webRequest', webRequest.onBeforeRequest._trigger.bind(webRequest.onBeforeRequest));


// extra response property to indicate that the ghostery counter should be increase
// TODO - is 'shouldIncrementCounter' allowed for all events?
export const VALID_RESPONSE_PROPERTIES = {
  onBeforeRequest: [
    'cancel',
    'redirectUrl',
    'shouldIncrementCounter',
  ],
  onBeforeSendHeaders: [
    'cancel',
    'requestHeaders',
    'shouldIncrementCounter',
  ],
  onSendHeaders: [
    'shouldIncrementCounter',
  ],
  onHeadersReceived: [
    'redirectUrl',
    'responseHeaders',
    'shouldIncrementCounter',
  ],
  onAuthRequired: [
    'cancel',
    'shouldIncrementCounter',
  ],
  onResponseStarted: [
    'shouldIncrementCounter',
  ],
  onBeforeRedirect: [
    'shouldIncrementCounter',
  ],
  onCompleted: [
    'shouldIncrementCounter',
  ],
  onErrorOccurred: [
  ],
};


export default webRequest;

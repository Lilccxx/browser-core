import utils from '../../core/utils';
import { Components, XPCOMUtils } from '../globals';

export function ChannelListener(headers) {
  this.headers = headers;
}

ChannelListener.prototype = {

  QueryInterface: XPCOMUtils.generateQI([
    Components.interfaces.nsIStreamListener,
    Components.interfaces.nsIRequestObserver,
    Components.interfaces.nsIInterfaceRequestor,
    Components.interfaces.nsIChannelEventSink,
  ]),

  // nsIInterfaceRequestor
  getInterface: function (aIID) {
    try {
      return this.QueryInterface(aIID);
    } catch (e) {
      throw Components.results.NS_NOINTERFACE;
    }
  },

  // nsIChannelEventSink
  asyncOnChannelRedirect: function (aOldChannel, aNewChannel, aFlags, callback) {
    aOldChannel.QueryInterface(Components.interfaces.nsIHttpChannel)
    aNewChannel.QueryInterface(Components.interfaces.nsIHttpChannel)

    this.headers.forEach((h) => {
      try {
        aOldChannel.getRequestHeader(h.name);  // make sure the old channel has cliqz header
        aNewChannel.setRequestHeader(h.name, h.value, false);
      }
      catch(e) {}
    });

    callback.onRedirectVerifyCallback(Components.results.NS_OK);
  },
};

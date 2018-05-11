import { getActiveTab } from '../platform/browser';

import { utils } from '../core/cliqz';

import CliqzADB, {
  adbABTestEnabled,
  ADB_PREF_VALUES,
  ADB_PREF_OPTIMIZED,
  ADB_PREF
} from './adblocker';


export default class Win {
  constructor({ window }) {
    this.window = window;
  }

  init() {
  }

  unload() {
  }

  status() {
    if (!adbABTestEnabled()) {
      return undefined;
    }

    return getActiveTab().then(({ id, url }) => {
      const isCorrectUrl = utils.isUrl(url);
      let disabledForUrl = false;
      let disabledForDomain = false;
      let disabledEverywhere = false;

      // Check if adblocker is disabled on this page
      if (isCorrectUrl && CliqzADB.adblockInitialized) {
        const whitelist = CliqzADB.urlWhitelist.getState(url);
        disabledForDomain = whitelist.hostname;
        disabledForUrl = whitelist.url;
      }

      const report = CliqzADB.adbStats.report(id);
      const enabled = utils.getPref(ADB_PREF, false) !== ADB_PREF_VALUES.Disabled;
      disabledEverywhere = !enabled && !disabledForUrl && !disabledForDomain;

      // Check stat of the adblocker
      let state;
      if (!enabled) {
        state = 'off';
      } else if (disabledForUrl || disabledForDomain) {
        state = 'off';
      } else {
        state = 'active';
      }

      // Check disable state
      let offState;
      if (disabledForUrl) {
        offState = 'off_website';
      } else if (disabledForDomain) {
        offState = 'off_domain';
      } else if (disabledEverywhere) {
        offState = 'off_all';
      } else {
        offState = 'off_website';
      }

      return {
        visible: true,
        enabled: enabled && !disabledForDomain && !disabledForUrl,
        optimized: utils.getPref(ADB_PREF_OPTIMIZED, false) === true,
        disabledForUrl,
        disabledForDomain,
        disabledEverywhere,
        totalCount: report.totalCount,
        advertisersList: report.advertisersList,
        state,
        off_state: offState,
      };
    });
  }
}

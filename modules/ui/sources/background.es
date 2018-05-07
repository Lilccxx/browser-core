// Need to load views by hand so they will be ready once UI.js need them
// This should be moved to UI as soon as it will be moved from dist to sources
import background from '../core/base/background';
import prefs from '../core/prefs';
import { isPlatformAtLeastInVersion } from '../core/platform';
import AutocompleteComponent from '../platform/auto-complete-component';

const SEARCH_BAR_ID = 'search-container';
const URL_BAR_ID = 'urlbar-container';
const showSearchBar = 'dontHideSearchBar';
const handleSearchWidgetInPhoton = 'handleSearchWidgetInPhoton';

let CustomizableUI;

export default background({
  init() {
    AutocompleteComponent.init();
    if (isPlatformAtLeastInVersion('57.0')) {
      // Firefox 57 and above has the search widget hidden by default so we
      // do not need to do anything besides cleaning our old prefs

      if (!prefs.get(handleSearchWidgetInPhoton, false)) {
        // we try once to migrate the old setting
        prefs.set(handleSearchWidgetInPhoton, true);
        if (!prefs.get(showSearchBar, false)) {
          prefs.set('browser.search.widget.inNavBar', false, '');
        }
        if (prefs.has(showSearchBar)) {
          prefs.clear(showSearchBar);
        }
      }

      return;
    }

    CustomizableUI = Components.utils.import('resource:///modules/CustomizableUI.jsm', null).CustomizableUI;
    // we use CustomizableUI since 2.21.1
    prefs.clear('defaultSearchBarPosition');
    prefs.clear('defaultSearchBarPositionNext');

    this.customizableUIListener = {
      // Waiting for the nav-bar to be restored
      onAreaNodeRegistered(aAreaType) {
        if (aAreaType === CustomizableUI.AREA_NAVBAR) {
          if (!prefs.get(showSearchBar, false)) {
            // we always hide the search bar when Cliqz starts
            // as long as the user did not move it somewhere visible (showSearchBar pref)
            CustomizableUI.removeWidgetFromArea(SEARCH_BAR_ID);
          }
        }
      }
    };

    CustomizableUI.addListener(this.customizableUIListener);

    if (!prefs.get(showSearchBar, false)) {
      // we always hide the search bar when Cliqz starts
      // as long as the user did not move it somewhere visible (showSearchBar pref)
      CustomizableUI.removeWidgetFromArea(SEARCH_BAR_ID);
    }
  },

  unload() {
    AutocompleteComponent.unload();
    this.restoreSearchBar();
  },

  beforeBrowserShutdown() {
    this.restoreSearchBar();
  },

  restoreSearchBar() {
    if (isPlatformAtLeastInVersion('57.0')) {
      // Firefox 57 and above has the search widget hidden by default
      // so we do not need to do anything
      return;
    }

    if (CustomizableUI.getPlacementOfWidget(SEARCH_BAR_ID) !== null) {
      // if the user moves the searchbar - we let him in full control
      prefs.set(showSearchBar, true);
    } else {
      // we always try to restore the searchbar close to the urlbar
      // both at shutdown and uninstall

      if (prefs.has(showSearchBar)) {
        prefs.clear(showSearchBar);
      }

      const urlbarPlacement = CustomizableUI.getPlacementOfWidget(URL_BAR_ID);
      CustomizableUI.addWidgetToArea(SEARCH_BAR_ID,
        CustomizableUI.AREA_NAVBAR, urlbarPlacement.position + 1);
    }

    CustomizableUI.removeListener(this.customizableUIListener);
  },

  events: {
  }
});

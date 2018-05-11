import { utils } from "../core/cliqz";
import autocomplete from "../autocomplete/autocomplete";
import CliqzEvents from "../core/events";
import SearchHistory from "./search-history";
import { addStylesheet, removeStylesheet } from "../core/helpers/stylesheet";
import placesUtils from '../platform/places-utils';
import console from '../core/console';
import inject from '../core/kord/inject';
import Background from './background';
import urlbarEventHandlers from './urlbar-events';

const ACproviderName = 'cliqz-results';

function getPopupDimensions(urlbar, win) {
  var urlbarRect = urlbar.getBoundingClientRect();
  // x,y are the distance from the topleft of the popup to urlbar.
  return {
    width: win.innerWidth,
    x: -1 * (urlbarRect.left || urlbarRect.x || 0),
    y: 0
  }
}

function initPopup(popup, urlbar, win) {
  //patch this method to avoid any caching FF might do for components.xml
  popup._appendCurrentResult = function(){
    if(popup.mInput){
      //try to break the call stack which cause 'too much recursion' exception on linux systems
      utils.setTimeout(win.CLIQZ.UI.handleResults.bind(win), 0);
    }
  };

  popup._openAutocompletePopup = function(aInput, aElement){
    const lr = autocomplete.lastResult;
    if(lr && lr.searchString != aInput.value && aInput.value == '') {
      return;
    }

    if (!autocomplete.isPopupOpen) {
      this.mInput = aInput;
      this._invalidate();
      let popupDimensions = getPopupDimensions(aElement, win);
      let attachToElement = aElement;

      attachToElement = win.document.querySelector('#nav-bar');
      popupDimensions = Object.assign(popupDimensions, {
        x: 0,
        y: 0,
      });


      this.setAttribute("width", popupDimensions.width);
      win.document.getElementById('cliqz-popup').style.width = `${popupDimensions.width}px`;
      this.openPopup(attachToElement, "after_start", popupDimensions.x, popupDimensions.y, false, true);
    }
  }.bind(popup);

  // set initial width of the popup equal with the width of the urlbar
  setPopupWidth(popup, urlbar);
}

function setPopupWidth(popup, urlBar){
  var width = urlBar.getBoundingClientRect().width;
  popup.setAttribute("width", width > 500 ? width : 500);
}

const STYLESHEET_URL = 'chrome://cliqz/content/static/styles/styles.css';

/**
  @namespace ui
*/
export default class Win {

  /**
  * @class Window
  * @constructor
  */
  constructor(settings) {
    this.dropdown = inject.module('dropdown');
    this.autocompleteModule = inject.module('autocomplete');
    this.elems = [];
    this.settings = settings.settings;
    this.window = settings.window;
    this.windowId = settings.windowId;
    this.urlbar = this.window.gURLBar;
    this.urlbarGoClick = this.urlbarGoClick.bind(this);
    this.hidePopup = this.hidePopup.bind(this);
    this.initialized = false;
    this.window.CLIQZ.UI = {};
    this.actions = {
      setUrlbarValue: (value, options = {}) => {
        let opts = typeof options === 'object' ?
          options :
          { visibleValue: options };

        let ifMatches = opts.match || (() => true);

        if (ifMatches instanceof RegExp) {
          const re = ifMatches;
          ifMatches = s => !!s.match(re);
        } else if (typeof ifMatches !== 'function') {
          const m = ifMatches.toString();
          ifMatches = s => m === s;
        }

        if (ifMatches(this.urlbar.value)) {
          this.urlbar.value = value;
        }

        if (ifMatches(this.urlbar.mInputField.value)) {
          this.urlbar.mInputField.value = opts.visibleValue || value;
        }

        if (opts.focus) {
          this.urlbar.mInputField.focus();
        }
      },
      syncUrlbarValue: () => {
        this.urlbar.value = this.urlbar.mInputField.value;
      },
      updatePopupStyle: () => {
        if (!this.popup) {
          return;
        }
      },
      updateUrlBar: () => { this.reloadUrlbar(); }
    },
    this.urlbarEventHandlers = {}
    Object.keys(urlbarEventHandlers).forEach( ev => {
      this.urlbarEventHandlers[ev] = urlbarEventHandlers[ev].bind(this)
    })

    this.popupEventHandlers = {}
    Object.keys(popupEventHandlers).forEach( ev => {
      this.popupEventHandlers[ev] = popupEventHandlers[ev].bind(this)
    })
  }

  /**
  * @method init
  */
  init() {
    // do not initialize the UI if locationbar is invisible in this window
    if(!this.window.locationbar.visible) return;

    console.log("UI window init");

    //create a new panel for cliqz to avoid inconsistencies at FF startup
    var document = this.window.document;

    addStylesheet(this.window.document, STYLESHEET_URL);

    const autocompleteLoadingPromise = this.autocompleteModule.isReady().then( () => {
      // Load autocompletesearch as soon as possible - it is compatible with
      // default firefox and will work with any UI
      this._autocompletesearch = this.urlbar.getAttribute('autocompletesearch');
      this.urlbar.setAttribute('autocompletesearch', ACproviderName);
    });

    let uiLoadingPromise;
    return autocompleteLoadingPromise.then(() => {
      return this.dropdown.windowAction(this.window, 'init');
    }).then(() => {

      this.window.CLIQZ.Core.urlbar = this.urlbar;
      this.window.CLIQZ.settings = this.settings;

      this.popupHideEvent = CliqzEvents.subscribe('ui:popup_hide', this.hidePopup);
      this.clickOnUrlEvent = CliqzEvents.subscribe('ui:click-on-url', this.showLastQuery.bind(this));

      this.window.CLIQZ.UI.autocompleteQuery = this.autocompleteQuery.bind(this);

      this.urlbar.setAttribute('pastetimeout', 0);

      var popup = document.createElementNS("http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul", "panel");
      this.popup = popup;
      this.popup.oneOffSearchButtons = () => {};
      this.window.CLIQZ.Core.popup = this.popup;
      popup.setAttribute("type", 'autocomplete-richlistbox');
      popup.setAttribute("noautofocus", 'true');
      popup.setAttribute("id", 'PopupAutoCompleteRichResultCliqz');
      this.elems.push(popup);
      document.getElementById('PopupAutoCompleteRichResult').parentElement.appendChild(popup);
      initPopup(this.popup, this.urlbar, this.window);

      this.window.CLIQZ.UI.showDebug = utils.getPref('showQueryDebug', false);

      this._autocompletepopup = this.urlbar.getAttribute('autocompletepopup');
      this.urlbar.setAttribute('autocompletepopup', /*'PopupAutoComplete'*/ 'PopupAutoCompleteRichResultCliqz');

      this.popup.addEventListener('popuphiding', this.popupEventHandlers.popupClose);
      this.popup.addEventListener('popupshowing', this.popupEventHandlers.popupOpen);

      Object.keys(this.urlbarEventHandlers).forEach(function(ev) {
        this.urlbar.addEventListener(ev, this.urlbarEventHandlers[ev]);
      }.bind(this));

      //mock default FF function
      this.popup.enableOneOffSearches = function() {};

      // make CMD/CTRL + K equal with CMD/CTRL + L
      this.searchShortcutElements = this.window.document.getElementById('mainKeyset').querySelectorAll('#key_search, #key_search2');
      [].forEach.call(this.searchShortcutElements, function (item) {
        item.setAttribute('original_command', item.getAttribute('command'))
        item.setAttribute('command', 'Browser:OpenLocation')
      });

      this.tabChange = SearchHistory.tabChanged.bind(SearchHistory);
      this.window.gBrowser.tabContainer.addEventListener("TabSelect", this.tabChange, false);

      this.tabRemoved = SearchHistory.tabRemoved.bind(SearchHistory);
      this.window.gBrowser.tabContainer.addEventListener("TabClose", this.tabRemoved, false);
      this.actions.updatePopupStyle();
      // Add search history dropdown
      }).then(() => {
        this.reloadUrlbar();
        this.initialized = true;
        this.elems.push(SearchHistory.insertBeforeElement(this.window));

        var urlBarGo = document.getElementById('urlbar-go-button') ||
        // FF56+
        document.getAnonymousElementByAttribute(this.urlbar, 'anonid', 'go-button');

        if (urlBarGo) {
          this._urlbarGoButtonClick = urlBarGo.getAttribute('onclick');
          this._urlBarGo = urlBarGo;
          // we somehow break default FF -> on goclick the autocomplete doesnt get considered
          this._urlBarGo.addEventListener('click', this.urlbarGoClick);
        }

        this.applyAdditionalThemeStyles();
      });
  }

  autocompleteQuery(firstResult, firstTitle) {
      var urlBar = this.urlbar;
      if (urlBar.selectionStart !== urlBar.selectionEnd) {
          // TODO: temp fix for flickering,
          // need to make it compatible with auto suggestion
          urlBar.mInputField.value = urlBar.mInputField.value.slice(0, urlBar.selectionStart);
      }
      if(autocomplete._lastKey  === this.window.KeyEvent.DOM_VK_BACK_SPACE ||
         autocomplete._lastKey  === this.window.KeyEvent.DOM_VK_DELETE){
          if (autocomplete.selectAutocomplete) {
              this.window.CLIQZ.UI.selectAutocomplete();
          }
          autocomplete.selectAutocomplete = false;
          return;
      }
      autocomplete.selectAutocomplete = false;

      // History cluster does not have a url attribute, therefore firstResult is null
      var lastPattern = autocomplete.lastPattern,
          fRes = lastPattern ? lastPattern.filteredResults() : null;
      if(!firstResult && lastPattern && fRes.length > 1) {
        firstResult = fRes[0].url;
      }

      firstResult = utils.cleanMozillaActions(firstResult)[1];

      var r, endPoint = urlBar.value.length;
      var lastPattern = autocomplete.lastPattern;
      var results = lastPattern ? fRes : [];

      // try to update misspelings like ',' or '-'
      if (this.cleanUrlBarValue(urlBar.value).toLowerCase() != urlBar.value.toLowerCase()) {
          urlBar.mInputField.value = this.cleanUrlBarValue(urlBar.value).toLowerCase();
      }
      // Use first entry if there are no patterns
      if (results.length === 0 || lastPattern.query != urlBar.value ||
        utils.generalizeUrl(firstResult) != utils.generalizeUrl(results[0].url)) {
          var newResult = [];
          newResult.url = firstResult;
          newResult.title = firstTitle;
          newResult.query = [];
          results.unshift(newResult);
      }
      // FIXME: we get [[]] here for dropdown module
      if (!utils.isUrl(results[0].url)) return;

      // Detect autocomplete
      var historyClusterAutocomplete = autocomplete.CliqzHistoryCluster.autocompleteTerm(urlBar.value, results[0], true);

      // No autocomplete
      if(!historyClusterAutocomplete.autocomplete ||
         !utils.getPref("browser.urlbar.autoFill", false, '')){ // user has disabled autocomplete
          this.window.CLIQZ.UI.clearAutocomplete();
          autocomplete.lastAutocomplete = null;
          autocomplete.lastAutocompleteType = null;
          autocomplete.selectAutocomplete = false;
          return;
      }

      // Apply autocomplete
      autocomplete.lastAutocompleteType = historyClusterAutocomplete.type;
      autocomplete.lastAutocompleteLength = historyClusterAutocomplete.full_url.length;
      autocomplete.lastAutocompleteUrlbar = historyClusterAutocomplete.urlbar;
      autocomplete.lastAutocompleteSelectionStart = historyClusterAutocomplete.selectionStart;
      urlBar.mInputField.value = historyClusterAutocomplete.urlbar;
      urlBar.setSelectionRange(historyClusterAutocomplete.selectionStart, urlBar.mInputField.value.length);
      autocomplete.lastAutocomplete = historyClusterAutocomplete.full_url;
      this.window.CLIQZ.UI.cursor = historyClusterAutocomplete.selectionStart;

      // Highlight first entry in dropdown
      if (historyClusterAutocomplete.highlight) {
          autocomplete.selectAutocomplete = true;
          this.window.CLIQZ.UI.selectAutocomplete();
      }

      return true;
  }

  cleanUrlBarValue(val) {
      var cleanParts = utils.cleanUrlProtocol(val, false).split('/'),
          host = cleanParts[0],
          pathLength = 0,
          SYMBOLS = /,|\./g;

      if(cleanParts.length > 1){
          pathLength = ('/' + cleanParts.slice(1).join('/')).length;
      }
      if(host.indexOf('www') == 0 && host.length > 4){
          // only fix symbols in host
          if(SYMBOLS.test(host[3]) && host[4] != ' ')
              // replace only issues in the host name, not ever in the path
              return val.substr(0, val.length - pathLength).replace(SYMBOLS, '.') +
                     (pathLength? val.substr(-pathLength): '');
      }
      return val;
  }
  /**
  * triggers component reload at install/uninstall
  * @method reloadUrlbar
  */
  reloadUrlbar() {
    const el = this.urlbar;
    const oldVal = el.value;
    const hadFocus = el.focused;
    const popup = this.window.gURLBar.popup;

    const onFocus = () => {
      el.removeEventListener('focus', onFocus);

      if (this.urlbar.getAttribute('autocompletesearch').indexOf(ACproviderName) === -1) {
        return;
      }

      // close the old popup if it is open
      popup.closePopup();

      this.window.CLIQZ.Core.popup = this.popup;

      // redo search query
      if (oldVal) {
        inject.module('autocomplete').isReady().then(() => {
          inject.module('core').action('queryCliqz', oldVal);
        });
      };
    };

    if (el && el.parentNode) {
      el.blur();
      el.parentNode.insertBefore(el, el.nextSibling);
      el.value = oldVal;

      if (hadFocus) {
        el.addEventListener('focus', onFocus);
        el.focus();
      }
    }
  }

  applyAdditionalThemeStyles() {
    const urlbar = this.urlbar;

    this.originalUrlbarPlaceholder = urlbar.mInputField.placeholder;

    urlbar.style.maxWidth = '100%';
    urlbar.style.margin = '0px 0px';

    if (this.settings.id !== 'funnelcake@cliqz.com' && this.settings.id !== 'description_test@cliqz.com') {
      urlbar.mInputField.placeholder = utils.getLocalizedString('freshtab.urlbar.placeholder');
    }
  }

  revertAdditionalThemeStyles() {
    const urlbar = this.urlbar;

    urlbar.style.maxWidth = '';
    urlbar.style.margin = '';
    urlbar.mInputField.placeholder = this.originalUrlbarPlaceholder;
  }

  /**
   * @method urlbarGoClick
   */
  urlbarGoClick (){
    //we somehow break default FF -> on goclick the autocomplete doesnt get considered
    this.urlbar.value = this.urlbar.mInputField.value;
    var action = {
      type: 'activity',
      position_type: ['inbar_' + (utils.isUrl(this.urlbar.mInputField.value)? 'url': 'query')],
      autocompleted: autocomplete.lastAutocompleteActive,
      action: 'urlbar_go_click'
    };
    utils.telemetry(action);
  }

  popupEvent(open) {
    var action = {
      type: 'activity',
      action: 'dropdown_' + (open ? 'open' : 'close')
    };

    if (open) {
      action['width'] = this.popup ?
        Math.round(this.popup.width) : 0;
    }

    utils.telemetry(action);
  }

  hidePopup() {
    this.window.CLIQZ.Core.popup.hidePopup();
  }

  showLastQuery(event) {
    if (event.windowId !== this.windowId || event.isPrivateWindow) {
      return;
    }
    SearchHistory.lastQuery(this.window);
  }

  urlbarEvent(ev) {
    var action = {
      type: 'activity',
      action: 'urlbar_' + ev
    };

    CliqzEvents.pub('core:urlbar_' + ev);
    utils.telemetry(action);
  }

  unload() {
    if (!this.initialized) return;

    removeStylesheet(this.window.document, STYLESHEET_URL);

    this.urlbar.setAttribute('autocompletesearch', this._autocompletesearch);

    if (this.popupHideEvent) {
      this.popupHideEvent.unsubscribe();
      this.popupHideEvent = undefined;
    }

    if (this.clickOnUrlEvent) {
      this.clickOnUrlEvent.unsubscribe();
      this.clickOnUrlEvent = undefined;
    }

    this.urlbar.setAttribute('autocompletepopup', this._autocompletepopup);

    this.popup.removeEventListener('popuphiding', this.popupEventHandlers.popupClose);
    this.popup.removeEventListener('popupshowing', this.popupEventHandlers.popupOpen);
    Object.keys(this.urlbarEventHandlers).forEach(function(ev) {
      this.urlbar.removeEventListener(ev, this.urlbarEventHandlers[ev]);
    }.bind(this));
    // revert onclick handler
    [].forEach.call(this.searchShortcutElements, function (item) {
      item.setAttribute('command', item.getAttribute('original_command'))
    });
    this.window.gBrowser.tabContainer.removeEventListener("TabSelect",
      this.tabChange, false);
    this.window.gBrowser.tabContainer.removeEventListener("TabClose",
      this.tabRemoved, false);

    if (this._urlBarGo) {
      this._urlBarGo.removeEventListener('click', this.urlbarGoClick);
    }

    var searchContainer = this.window.document.getElementById('search-container');
    if(this._searchContainer){
      searchContainer.setAttribute('class', this._searchContainer);
    }
    this.reloadUrlbar();
    this.revertAdditionalThemeStyles();

    this.elems.forEach(item => {
      item && item.parentNode && item.parentNode.removeChild(item);
    });

    delete this.window.CLIQZ.UI;
  }
}

const popupEventHandlers = {
  /**
  * @event popupOpen
  */
  popupOpen: function(e){
    autocomplete.isPopupOpen = true;
    if (e.composedTarget !== this.popup) {
      return;
    }
    this.popupEvent(true);
    this.window.CLIQZ.UI.popupClosed = false;
  },

  /**
  * @event popupClose
  * @param e
  */
  popupClose: function(e){
    autocomplete.markResultsDone(null);
    autocomplete.isPopupOpen = false;
    if (e.composedTarget !== this.popup) {
      return;
    }
    this.popupEvent(false);
    this.window.CLIQZ.UI.popupClosed = true;
  }
};

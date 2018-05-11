import CliqzHandlebars from 'handlebars';
import $ from 'jquery';
import QRCode from 'qrcode';

const images = {
  pairing_status_disconnected: './images/pairing-status-disconnected.png',
  pairing_status_active: './images/pairing-status-active.png',
  cliqz_icon: './images/cliqz-icon.png',
};

export default class PairingUI {
  constructor(window, PeerComm, telemetry) {
    this.i18n = window.chrome.i18n.getMessage.bind(window.chrome.i18n);
    this.document = window.document;
    this.window = window;
    this.PeerComm = PeerComm;
    this.telemetry = telemetry;


    this.TEMPLATE_NAMES = ['template'];
    this.TEMPLATE_CACHE = {};

    this.onHashChange = this.onHashChange.bind(this);
    this.window.parent.addEventListener('hashchange', this.onHashChange);
    this.onHashChange();

    this.connectionChecker = setInterval(() => {
      PeerComm.checkMasterConnection().catch(() => {});
    }, PairingUI.checkInterval);

    // Pairing events
    this.oninit = (info) => {
      this.renderInitial();
      if (info.isPaired) {
        this.renderPaired(info);
      } else if (info.isPairing) {
        this.onpairing(info);
      } else {
        this.onunpaired(info);
      }
    };
    this.ondeviceadded = this.renderPaired.bind(this);
    this.onpairing = this.renderPairing.bind(this);
    this.onpaired = this.renderPaired.bind(this);
    this.onunpaired = ({ isUnpaired }) => {
      this.renderUnpaired();
      if (isUnpaired) {
        this.startPairing();
      }
    };
    this.onmasterconnected = this.renderPaired.bind(this);
    this.onmasterdisconnected = this.renderPaired.bind(this);
  }

  init() {
    this.compileTemplate().then(() => {
      this.PeerComm.getInfo().then((info) => {
        if (info.isInit) {
          this.oninit(info);
        }
      });
    });
  }

  startPairing() {
    this.PeerComm.startPairing();
  }

  fetchTemplate(name) {
    const url = `./template/${name}.hbs`;
    return new Promise((resolve, reject) => {
      try {
        const xmlHttp = new XMLHttpRequest();
        xmlHttp.open('GET', url, false);
        xmlHttp.overrideMimeType('text/plain');
        xmlHttp.send(null);
        resolve({ name, html: xmlHttp.responseText });
      } catch (err) {
        reject(err);
      }
    });
  }

  compileTemplate() {
    return Promise.all(this.TEMPLATE_NAMES.map(this.fetchTemplate.bind(this))).then((templates) => {
      templates.forEach((tpl) => {
        this.TEMPLATE_CACHE[tpl.name] = CliqzHandlebars.compile(tpl.html);
      });
      return Promise.resolve();
    });
  }

  updatePairingStatus(status) {
    $('#page-container').attr('state', status);
  }

  updateConnectionInfo(isMasterConnected, deviceName, masterName) {
    $('#device-name').text(deviceName);
    $('#master-name').text(masterName);
    this.updatePairingStatus('paired');

    if (isMasterConnected) {
      $('#connection-status-img').attr('src', images.pairing_status_active);
      $('#connection-status-text').attr('class', 'connected');
      $('#connection-status-text').text(this.i18n('pairing-online'));
      $('#on-disconnected-tip').css('display', 'none');
    } else {
      $('#connection-status-img').attr('src', images.pairing_status_disconnected);
      $('#connection-status-text').attr('class', 'disconnected');
      $('#connection-status-text').text(this.i18n('pairing-offline'));
      $('#on-disconnected-tip').css('display', 'block');
    }
  }

  renderPairing({ pairingToken }) {
    const token = pairingToken;
    if (token) {
      if (!this.qr) {
        this.qr = new QRCode($('#qrcode')[0], {
          text: token,
          width: 256,
          height: 256,
          colorDark: '#000000',
          colorLight: '#ffffff',
          correctLevel: QRCode.CorrectLevel.Q,
        });
        $(`<img src="${images.cliqz_icon}" class="icon-logo" alt=""/>`).insertAfter('#qrcode > canvas');
      } else {
        this.qr.makeCode(token);
      }
    }
  }

  renderPaired({ isPaired, masterName, deviceName, isMasterConnected }) {
    if (!isPaired) return;
    this.updateConnectionInfo(isMasterConnected, deviceName, masterName);
  }

  renderUnpaired() {
    this.updatePairingStatus('unpaired');
  }

  renderInitial() {
    const window = this.window;

    const deviceName = $('#browser-name').val() ||
      `Cliqz Browser on ${window.navigator.platform}`;

    const data = {
      deviceName,
    };

    data.i18n = {
      title: this.i18n('pairing-title'),
      instructionsTitle: this.i18n('pairing-instructions-title'),
      instructionsAndroid: this.i18n('pairing-instructions-playstore'),
      instructionsIOs: this.i18n('pairing-instructions-appstore'),

      videoDownloaderTitle: this.i18n('pairing-video-title'),
      receiveTabTitle: this.i18n('pairing-receive-tab-title'),
      sendTabTitle: this.i18n('pairing-send-tab-title'),

      connectedTitle: this.i18n('pairing-status-title'),
      pairingBrowserPairWith: this.i18n('pairing-browser-pair-with'),
      onDisconnectedTip: this.i18n('pairing-on-disconnected-tip'),
      contactSupport: this.i18n('pairing-contact-support'),
      contactLearnMore: this.i18n('pairing-contact-learn-more'),

      pairingScanTitle: this.i18n('pairing-scan-title'),
      pairingErrorMessage: this.i18n('pairing-error-message'),

      pairingAllFeatures: this.i18n('pairing-all-features-title'),
      pairingEnabledFeatures: this.i18n('pairing-enabled-features-title'),

      unpair: this.i18n('pairing-unpair'),
    };

    $('#content').html(this.TEMPLATE_CACHE.template(data));

    $('#unpair-button').click(() => {
      this.PeerComm.unpair();

      this.telemetry({
        type: 'settings',
        version: 1,
        view: 'connect',
        action: 'click',
        target: 'remove',
      });
    });

    $('.support-link').click(() => {
      this.telemetry({
        type: 'settings',
        version: 1,
        view: 'connect',
        action: 'click',
        target: 'support',
      });
    });

    this.updatePairingStatus('unpaired');
  }

  unload() {
    clearInterval(this.connectionChecker);
    this.window.parent.removeEventListener('hashchange', this.onHashChange);
  }

  onHashChange() {
    if (this.window.parent.location.hash === '#connect') {
      this.telemetry({
        type: 'settings',
        version: 1,
        view: 'connect',
        action: 'show',
      });
    }
  }

  get observerID() {
    if (!this._observerID) {
      this._observerID = `__PAIRING__DASHBOARD__${Math.random()}`;
    }
    return this._observerID;
  }

  static get checkInterval() {
    return 5000;
  }
}

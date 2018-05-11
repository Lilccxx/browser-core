import {
  clearIntervals,
  Subject,
  defaultConfig,
  CONFIG,
} from './helpers';

describe('Fresh tab buttons UI', function () {
  const homeButtonSelector = '#cliqz-home';
  const historyButtonSelector = '#cliqz-history';
  const settingsButtonSelector = '#settings-btn';
  let subject;

  before(function () {
    subject = new Subject();
    subject.respondsWith({
      module: 'core',
      action: 'sendTelemetry',
      response: ''
    });

    subject.respondsWith(defaultConfig);

    subject.respondsWith({
      module: 'freshtab',
      action: 'getSpeedDials',
      response: {
        history: [
          {
            title: 'https://s3.amazonaws.com/cdncliqz/update/browser/latest.html',
            id: 's3.amazonaws.com/cdncliqz/update/browser/latest.html',
            url: 'https://s3.amazonaws.com/cdncliqz/update/browser/latest.html',
            displayTitle: 's3.amazonaws.com',
            custom: false,
            logo: {
              text: 's3',
              backgroundColor: 'c3043e',
              buttonsClass: 'cliqz-brands-button-1',
              style: 'background-color: #c3043e;color:#fff;'
            }
          }
        ],
        custom: []
      },
    });

    subject.respondsWith({
      module: 'freshtab',
      action: 'getNews',
      response: {
        version: 0,
        news: []
      }
    });
  });

  after(function () {
    clearIntervals();
  });

  context('rendered in wide window', function () {
    before(function () {
      return subject.load();
    });

    after(function () {
      subject.unload();
    });

    describe('renders home icon', function () {
      it('successfully', function () {
        chai.expect(subject.query(homeButtonSelector)).to.exist;
      });

      it('not hidden', function () {
        chai.expect(subject.getComputedStyle(homeButtonSelector).display).to.not.equal('none');
      });


      it('with correct text', function () {
        chai.expect(subject.query(homeButtonSelector)).to.have.text('Home');
      });

      it('with correct link', function () {
        chai.expect(subject.query(homeButtonSelector).href)
          .to.equal(CONFIG.settings.NEW_TAB_URL);
      });
    });

    describe('renders history icon', function () {
      it('successfully', function () {
        chai.expect(subject.query(historyButtonSelector)).to.exist;
      });

      it('not hidden', function () {
        chai.expect(subject.getComputedStyle(historyButtonSelector).display).to.not.equal('none');
      });

      it('with correct text', function () {
        chai.expect(subject.query(historyButtonSelector)).to.have.text('History');
      });

      it('with correct link', function () {
        chai.expect(subject.query(historyButtonSelector).href)
          .to.contain(CONFIG.settings.HISTORY_URL);
      });
    });

    describe('renders settings icon', function () {
      it('successfully', function () {
        chai.expect(subject.query(settingsButtonSelector)).to.exist;
      });

      it('not hidden', function () {
        chai.expect(subject.getComputedStyle(settingsButtonSelector).display).to.not.equal('none');
      });

      it('with correct text', function () {
        chai.expect(subject.query(settingsButtonSelector)).to.have.text('Settings');
      });
    });
  });

  context('rendered in narrow window', function () {
    before(function () {
      return subject.load({ iframeWidth: 300 });
    });

    after(function () {
      subject.unload();
    });

    describe('renders home icon', function () {
      it('successfully', function () {
        chai.expect(subject.query(homeButtonSelector)).to.exist;
      });

      it('hidden', function () {
        chai.expect(subject.getComputedStyle(homeButtonSelector).display).to.equal('none');
      });
    });

    describe('renders history icon', function () {
      it('successfully', function () {
        chai.expect(subject.query(historyButtonSelector)).to.exist;
      });

      it('hidden', function () {
        chai.expect(subject.getComputedStyle(historyButtonSelector).display).to.equal('none');
      });
    });

    describe('renders settings icon', function () {
      it('successfully', function () {
        chai.expect(subject.query(settingsButtonSelector)).to.exist;
      });

      it('hidden', function () {
        chai.expect(subject.getComputedStyle(settingsButtonSelector).display).to.equal('none');
      });
    });
  });
});

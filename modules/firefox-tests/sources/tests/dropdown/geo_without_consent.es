/* global it, chai, respondWith, fillIn,waitForPopup,
   $cliqzResults, getLocaliseString */
/* eslint func-names: ['error', 'never'] */
/* eslint prefer-arrow-callback: 'off' */
/* eslint no-unused-expressions: 'off' */

import results from './fixtures/resultsGeoWithoutConsent';

export default function ({ isAskingForGeoConsent }) {
  (isAskingForGeoConsent ? context : xcontext)('for a local rich header without geo consent', function () {
    let resultElement;

    before(function () {
      respondWith({ results });
      fillIn('rewe');
      return waitForPopup().then(function () {
        resultElement = $cliqzResults().find(`a.result[href='${results[0].url}']`)[0].parentNode;
      });
    });

    it('renders rich header result successfully', function () {
      chai.expect(resultElement).to.exist;
    });

    describe('renders top element', function () {
      it('successfully', function () {
        const localTopSelector = 'a.result';
        chai.expect(resultElement.querySelector(localTopSelector)).to.exist;
      });

      it('with existing and correct title', function () {
        const localTopTitleSelector = 'a.result div.abstract span.title';
        chai.expect(resultElement.querySelector(localTopTitleSelector)).to.exist;
        chai.expect(resultElement.querySelector(localTopTitleSelector))
          .to.have.text(results[0].snippet.title);
      });

      it('with existing and correct domain', function () {
        const localTopTitleSelector = 'a.result div.abstract span.url';
        chai.expect(resultElement.querySelector(localTopTitleSelector)).to.exist;
        chai.expect(resultElement.querySelector(localTopTitleSelector))
          .to.contain.text(results[0].snippet.friendlyUrl);
      });

      it('with existing logo', function () {
        const localTopLogoSelector = 'a.result div.icons span.logo';
        chai.expect(resultElement.querySelector(localTopLogoSelector)).to.exist;
      });

      it('with a correct link', function () {
        const localTopLinkSelector = 'a.result';
        chai.expect(resultElement.querySelector(localTopLinkSelector).href)
          .to.equal(results[0].url);
      });

      it('with existing and correct description', function () {
        const localTopDescSelector = 'a.result div.abstract span.description';
        chai.expect(resultElement.querySelector(localTopDescSelector)).to.exist;
        chai.expect(resultElement.querySelector(localTopDescSelector))
          .to.have.text(results[0].snippet.description);
      });
    });

    describe('renders buttons area', function () {
      const buttonsAreaSelector = 'div.buttons';
      const buttonSelector = 'div.buttons a.btn';
      let buttonsArea;
      let buttonsItems;

      beforeEach(function () {
        buttonsArea = resultElement.querySelector(buttonsAreaSelector);
        buttonsItems = resultElement.querySelectorAll(buttonSelector);
      });

      it('successfully', function () {
        chai.expect(buttonsArea).to.exist;
        [...buttonsItems].forEach(function (button) {
          chai.expect(button).to.exist;
        });
      });

      it('with correct amount of buttons', function () {
        chai.expect(buttonsItems.length).to.equal(2);
      });

      describe('with a button to use location once', function () {
        it('with correct text', function () {
          chai.expect(buttonsItems[0]).to.contain.text(
            getLocaliseString({
              de: 'Ort & Kontakt jetzt anzeigen',
              default: 'Show location & contact now'
            })
          );
        });
      });

      describe('with a button to use location always', function () {
        it('with correct text', function () {
          chai.expect(buttonsItems[1]).to.contain.text(
            getLocaliseString({
              de: 'Immer anzeigen',
              default: 'Always show'
            })
          );
        });
      });
    });
  });
}

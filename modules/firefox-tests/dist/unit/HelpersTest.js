"use strict";

var expect = chai.expect;
DEPS.UtilsTest = ["core/utils"];
TESTS.UtilsTest = function (CliqzUtils) {
  var md5 = getModule('core/helpers/md5').default;
  describe('MD5 Hex-encoding', function () {
      it('should create a hex-encoded MD5 hash of an ASCII value', function () {
        expect(
          md5('cliqz')
        ).to.equal(
          'b0142f2841340cb81463761e4c1af118'
        );
      });

      it('should create a hex-encoded MD5 hash of an ASCII value', function () {
        expect(
          md5('value')
        ).to.equal(
          '2063c1608d6e0baf80249c42e2be5804'
        );
      });

      it('should create a hex-encoded MD5 hash of an UTF-8 value', function () {
        expect(
          md5('日本')
        ).to.equal(
          '4dbed2e657457884e67137d3514119b3'
        );
      });
    });
}

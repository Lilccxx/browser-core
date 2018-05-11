/* global chai */
/* global describeModule */
/* global require */
/* eslint-disable func-names,prefer-arrow-callback,arrow-body-style */


var prefRetVal = {};
var currentTS = Date.now();
var currentDayHour = 0;
var currentWeekDay = 0;
let hookedResultOfLoggerInfo;

export default describeModule('offers-v2/trigger_machine/ops/category_expr',
  () => ({
    'core/platform': {
      isChromium: false
    },
    'platform/xmlhttprequest': {
      default: {}
    },
    'platform/fetch': {
      default: {}
    },
    'platform/gzip': {
      default: {}
    },
    'platform/globals': {
      default: {}
    },
    'platform/environment': {
      default: {}
    },
    'core/crypto/random': {
      random: function () {
        return Math.random();
      }
    },
    'platform/console': {
      default: {},
    },
    'offers-v2/common/offers_v2_logger': {
      default: {
        debug: () => {},
        error: (...args) => {console.error(...args)},
        info: (...args) => { console.log(args); hookedResultOfLoggerInfo = args; },
        log: () => {},
        warn: () => { console.error(...args); },
        logObject: () => {},
      }
    },
    'core/cliqz': {
      utils: {
        setInterval: function() {},
        clearInterval: function() {},
      },
    },
    'core/prefs': {
      default: {
        get: function(x,y) {
          return y;
        }
      }
    },
    'core/time': {
      getDaysFromTimeRange: function(startTS, endTS) {
        return getDaysFromTimeRange(startTS, endTS);
      },
      getDateFromDateKey: function(dateKey, hours = 0, min = 0, seconds = 0) {
        return `${Number(dateKey) * DAY_MS}`;
      },
      timestamp: function() {
        return mockedTS;
      },
      getTodayDayKey: function() {
        return getTodayDayKey(mockedTS);
      }
    },
    'offers-v2/categories/category-handler': {
      default: class {
        constructor() {
          this.clear();
        }
        clear() {
          this.categories = {};
          this.buildCalled = false;
          this.categoriesAdded = [];
        }

        hasCategory(catName) { return !!(this.categories[catName]); }
        addCategory(category) { this.categoriesAdded.push(category); }
        removeCategory(category) { }
        build() { this.buildCalled = true; }
        cleanUp() { }
        newUrlEvent(tokenizedUrl) {}
        loadPersistentData() {}
        savePersistentData() { }

        getMatchesForCategory(catName) {
          // TODO
        }

        getMaxCountDaysForCategory(catName) {
          // TODO
        }

        getLastMatchTsForCategory(catName) {
          // TODO
        }
        isCategoryActive(catName) { return !!this.categories[catName]; }
      }
    }

  }),
  () => {
    describe('/category-expr operations', () => {
      let ops;
      let eventLoop;
      let buildDataGen;
      let prefMock;
      let ExpressionBuilder;
      let exprBuilder;
      let CategoryHandler;
      let catHandlerMock;

      function buildOp(obj) {
        return exprBuilder.createExp(obj);
      }

      function testCase(op, expectedVal, ctx) {
        const e = buildOp(op);
        return e.evalExpr(ctx).then((result) => {
          chai.expect(result).eql(expectedVal);
        });
      }

      function checkCategories(toUpdate, toCheck) {
        toUpdate.forEach((c) => {
          const catName = c.name;
          const hasCat = toCheck.some(cat => cat.getName() === catName);
          chai.expect(hasCat, `${catName} not found`).eql(true);
        });
      }

      beforeEach(function () {
        ops = this.module().default;
        CategoryHandler = this.deps('offers-v2/categories/category-handler').default;
        catHandlerMock = new CategoryHandler();
        buildDataGen = {
          category_handler: catHandlerMock,
        };
        return this.system.import('offers-v2/trigger_machine/exp_builder').then((mod) => {
          ExpressionBuilder = mod.default;
          exprBuilder = new ExpressionBuilder(buildDataGen);
        });
      });

      /**
       * ==================================================
       * $is_category_active operation tests
       * ==================================================
       */
      describe('/is_category_active', () => {
        let op;
        let ctx;
        beforeEach(function () {
          ctx = {};
          prefRetVal = {};
          catHandlerMock.clear();
        });

        it('/invalid args call', () => {
          const o = [
            '$is_category_active', []
          ];
          op = buildOp(o);
          return op.evalExpr(ctx).then((result) => {
            chai.assert.fail(result, 'error');
          }).catch((err) => {
            chai.expect(err).to.exist;
          });
        });

        it('/valid args but not active cat', () => {
          const o = [
            '$is_category_active', [{ catName: 'cat-x' }]
          ];
          op = buildOp(o);
          catHandlerMock.categories = { 'cat-x2': true };
          return op.evalExpr(ctx).then((result) => {
            chai.expect(result).eql(false);
          });
        });

        it('/valid args and active cat', () => {
          const o = [
            '$is_category_active', [{ catName: 'cat-x2' }]
          ];
          op = buildOp(o);
          catHandlerMock.categories = { 'cat-x2': true };
          return op.evalExpr(ctx).then((result) => {
            chai.expect(result).eql(true);
          });
        });

      });

       /**
       * ==================================================
       * $if_pref add_categories tests
       * ==================================================
       */
      describe('/add_categories', () => {
        let op;
        let ctx;
        beforeEach(function () {
          ctx = {};
          prefRetVal = {};
          catHandlerMock.clear();
        });

        it('/invalid args call', () => {
          const o = [
            '$add_categories', []
          ];
          op = buildOp(o);
          return op.evalExpr(ctx).then((result) => {
            chai.assert.fail(result, 'error');
          }).catch((err) => {
            chai.expect(err).to.exist;
          });
        });

        it('/invalid args call 2', () => {
          const o = [
            '$add_categories', [{}]
          ];
          op = buildOp(o);
          return op.evalExpr(ctx).then((result) => {
            chai.assert.fail(result, 'error');
          }).catch((err) => {
            chai.expect(err).to.exist;
          });
        });

        it('/invalid args call 3', () => {
          const o = [
            '$add_categories', [{ xyz:{} }]
          ];
          op = buildOp(o);
          return op.evalExpr(ctx).then((result) => {
            chai.assert.fail(result, 'error');
          }).catch((err) => {
            chai.expect(err).to.exist;
          });
        });

        it('/update categories properly', () => {
          const toUpdate = [
            { name: 'c1', patterns: [], version: 1, timeRangeSecs: 1, activationData: {} },
            { name: 'c2', patterns: [], version: 1, timeRangeSecs: 1, activationData: {} },
            { name: 'c3', patterns: [], version: 1, timeRangeSecs: 1, activationData: {} },
          ];
          const o = [
            '$add_categories', [{ toUpdate, }]
          ];
          op = buildOp(o);
          return op.evalExpr(ctx).then((result) => {
            chai.expect(result).eql(true);
            chai.expect(catHandlerMock.buildCalled).eql(true);
            checkCategories(toUpdate, catHandlerMock.categoriesAdded);
          });
        });

      });

    });
  },
);

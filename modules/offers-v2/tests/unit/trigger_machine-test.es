/* global chai */
/* global describeModule */
/* global require */


var prefRetVal = {};
var currentTS = Date.now();
var mockedTimestamp = Date.now() / 1000;
var currentDayHour = 0;
var currentWeekDay = 0;
var abNumber = 0;


export default describeModule('offers-v2/trigger_machine/trigger_machine',
  () => ({
    'offers-v2/common/offers_v2_logger': {
      default: {
        debug: (x) => {console.log(x);},
        error: (x) => {console.log(x);},
        info: (x) => {console.log(x);},
        log: (x) => {console.log(x);},
        warn: (x) => {console.log(x);},
        logObject: () => {console.log(x);},
      }
    },
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
    'offers-v2/utils': {
      timestamp: function() {
        return mockedTimestamp;
      },
      timestampMS: function() {
        return currentTS;
      },
      dayHour: function() {
        return currentDayHour;
      },
      weekDay: function() {
        return currentWeekDay;
      },
      getABNumber: function() {
        return abNumber;
      },
      hashString: function(str) {
        /* eslint-disable no-bitwise */
        let hash = 5381;
        for (let i = 0, len = str.length; i < len; i += 1) {
          hash = (hash * 33) ^ str.charCodeAt(i);
        }
        // For higher values, we cannot pack/unpack
        return (hash >>> 0) % 2147483648;
      }
    },
    'offers-v2/offers_db': {
      default: class {
        constructor() {
          this.offerMetaMap = {};
        }
        getOfferMeta(oid) {
          return this.offerMetaMap[oid];
        }
        clear() {
          this.offerMetaMap = {};
        }
      }
    },
    'offers-v2/offer_processor': {
      default: class {
        constructor() {
          this.lastSelOffer = null;
          this.lastRInfo = null;
        }
        pushOffer(selOffer, rinfo) {
          this.lastSelOffer = selOffer;
          this.lastRInfo = rinfo;
          return true;
        }
        clear() {
          this.lastSelOffer = null;
          this.lastRInfo = null;
        }
      }
    },
    'offers-v2/history_index': {
      default: class {
        constructor() {
          this.start = null;
          this.end = null;
          this.lastUrl = null;
          this.context = null;
          this.ret = [];
        }
        queryHistory(s, e) {
          this.start = s;
          this.end = e;
          return this.ret;
        }
        addUrl(url, context) {
          this.lastUrl = url;
          this.context = context;
        }
        clear() {
          this.start = null;
          this.end = null;
          this.lastUrl = null;
          this.context = null;
          this.ret = [];
        }
      }
    },
    'core/crypto/random': {
      random: function () {
        return Math.random();
      }
    },
    'offers-v2/regexp_cache': {
      default: class {
        getRegexp(p) {
          return new RegExp(p);
        }
      }
    },
    'core/prefs': {
      default: {
        get: function(v, d) {
          if (prefRetVal[v]) {
            return prefRetVal[v];
          }
          return d;
        },
        setMockVal: function(varName, val) {
          prefRetVal[varName] = val;
        }
      }
    },
    'core/cliqz': {
      default: {},
      utils: {
        setInterval: function() {},
        getPref: function(p, v) {
          return v;
        }
      }
    },
    'core/time': {
      getDaysFromTimeRange: function(startTS, endTS) { },
      getDateFromDateKey: function(dateKey, hours = 0, min = 0, seconds = 0) { },
      timestamp: function() { },
      getTodayDayKey: function() { }
    },
    'platform/console': {
      default: {},
    },
    // mocks
    'offers-v2/history_index': {
      default: class {
        constructor(el) {
          // TODO
        }
        queryHistory() {
          // TODO
        }
        addUrl() {
          // TODO
        }
        save() {
          // TODO
        }
        load() {
          // TODO
        }
        timestamp() {
          return Math.round(Date.now() / 1000);
        }
      }
    },
    // 'offers-v2/trigger_machine/expression_cache': {
    //   default: class {
    //     constructor() {
    //       this.cache = {};
    //     }
    //     destroy() {
    //     }
    //     addEntry(expID, ttlSecs, val) {
    //       console.log('xxxxxx', `cache addEntry: ${expID} -> ${val}`);
    //       this.cache[expID] = val;
    //     }
    //     getEntry(expID) {
    //       console.log('xxxxxx', `cache getEntry: ${expID} -> ${JSON.stringify(this.cache)} - ${expID in this.cache}`);
    //       if (!expID || !(expID in this.cache)) {
    //         return null;
    //       }
    //       return this.cache[expID];
    //     }
    //   }
    // },
  }),
  () => {
    describe('trigger_machine', function() {
      // here we will define all the modules we need / depend on for the
      // construction of the event loop and different objects,
      // we may need to refactor the code to make this clear later
      // some of the modules will be mocked some others not
      let HistoryIndex;
      let TriggerMachine;
      let RegexpCache;
      let TriggerCache;
      let ExpressionBuilder;
      let exprBuilder;
      let buildDataGen;
      let Expression;
      let exprMockCallbacks;
      let MockExpression;
      let globObjs;

      function setMockCallbacks(id, cb) {
        if (!exprMockCallbacks) {
          exprMockCallbacks = {};
        }
        exprMockCallbacks[id] = cb;
      }

      function buildOp(obj) {
        return exprBuilder.createExp(obj);
      }

      function testCase(op, expectedVal, ctx) {
        const e = buildOp(op);
        return e.evalExpr(ctx).then((result) => {
          chai.expect(result).to.eq(expectedVal);
        });
      }

      function buildAndExec(op, ctx, t) {
        const e = buildOp(op, t);
        return e.evalExpr(ctx);
      }

      // hook an operation callback
      function hookExpr(opName, callbacks) {
        exprBuilder.registerOpsBuilder(opName, MockExpression);
        setMockCallbacks(opName, callbacks);
      }

      beforeEach(function () {
        exprMockCallbacks = null;
        globObjs = {};
        buildDataGen = { };
        HistoryIndex = this.deps('offers-v2/history_index').default;
        TriggerMachine = this.module().default;
        const pRegexpCache = this.system.import('offers-v2/regexp_cache');
        const pTriggerCache = this.system.import('offers-v2/trigger_machine/trigger_cache');
        const promExpBuilder = this.system.import('offers-v2/trigger_machine/exp_builder');
        const promExpression = this.system.import('offers-v2/trigger_machine/expression');
        const pList = [pRegexpCache, pTriggerCache, promExpBuilder, promExpression];
        return Promise.all(pList).then((mods) => {
          RegexpCache = mods[0].default;
          TriggerCache = mods[1].default;
          ExpressionBuilder = mods[2].default;
          Expression = mods[3].default;
          class mockClass extends Expression {
            constructor(data) {
              super(data);
              this.opName = this.getOpName();
              this.hasMockCallbacks = exprMockCallbacks && exprMockCallbacks[this.opName];
            }
            isBuilt() {
              if (this.hasMockCallbacks && exprMockCallbacks[this.opName].isBuilt) {
                return exprMockCallbacks[this.opName].isBuilt();
              }
              return true;
            }
            build() {
              if (this.hasMockCallbacks && exprMockCallbacks[this.opName].build) {
                return exprMockCallbacks[this.opName].build();
              }
            }
            destroy() {
              if (this.hasMockCallbacks && exprMockCallbacks[this.opName].destroy) {
                return exprMockCallbacks[this.opName].destroy();
              }
            }
            getExprValue(ctx) {
              if (this.hasMockCallbacks && exprMockCallbacks[this.opName].getExprValue) {
                return exprMockCallbacks[this.opName].getExprValue(ctx);
              }
              return Promise.resolve(true);
            }
          }
          MockExpression = mockClass;
        });
      });

      describe('#correctness_tests', function () {
        context('/basic simple tests', function () {
          let env;
          let evLoop;
          let tm;
          beforeEach(function () {
            exprMockCallbacks = null;
            // env = new ExtensionEnvironment();
            // evLoop = new EventLoop(env);
            tm = new TriggerMachine(globObjs);
            exprBuilder = tm.expressionBuilder;
            chai.expect(exprBuilder).to.exist;
          });

          it('/trigger machine can evaluate simple trigger', () => {
            const context =  {};
            const t = {
              parent_trigger_ids: [],
              trigger_id: 'trigger-test',
              ttl: 3600,
              condition: null,
              actions: [
                ['$test_method', []]
              ]
            };
            let counter = 0;
            let callbacks = {
              getExprValue: () => {
                counter += 1;
                return Promise.resolve(true);
              }
            };
            hookExpr('$test_method', callbacks);
            return tm.run(t, context).then(() => {
              chai.expect(counter).to.be.equal(1);
            });
          });

           it('/invalid trigger doesnt run', () => {
            const context =  {};
            const t = {
              parent_trigger_ids: [],
              trigger_id: 'trigger-test',
              ttl: 3600,
              condition: null,
              invalid_actions: [
                ['$test_method', []]
              ]
            };
            let counter = 0;
            let callbacks = {
              getExprValue: () => {
                counter += 1;
                return Promise.resolve(true);
              }
            };
            hookExpr('$test_method', callbacks);
            return tm.run(t, context).then((result) => {
              chai.expect(counter).eql(0);
            }).catch((err) => {
              chai.expect(err).eql(false);
            });
          });


           it('/invalid operation cannot run', () => {
            const context =  {};
            const t = {
              parent_trigger_ids: [],
              trigger_id: 'trigger-test',
              ttl: 3600,
              condition: null,
              actions: [
                ['$test_method', []]
              ]
            };
            return tm.run(t, context).then((result) => {
              chai.expect(result).eql(false);
            }).catch((err) => {
              chai.expect(err).eql(false);
            });
          });

          it('/invalid operation syntax cannot run', () => {
            const context =  {};
            const t = {
              parent_trigger_ids: [],
              trigger_id: 'trigger-test',
              ttl: 3600,
              condition: null,
              actions: [
                ['test_method', []]
              ]
            };
            let counter = 0;
            let callbacks = {
              getExprValue: () => {
                counter += 1;
                return Promise.resolve(true);
              }
            };
            hookExpr('$test_method', callbacks);
            return tm.run(t, context).then((result) => {
              chai.expect(result).eql(false);
            }).catch((err) => {
              chai.expect(err).eql(false);
            });
          });

          it('/invalid operation syntax cannot run 2', () => {
            const context =  {};
            const t = {
              parent_trigger_ids: [],
              trigger_id: 'trigger-test',
              ttl: 3600,
              condition: null,
              actions: [
                '$test_method', []
              ]
            };
            let counter = 0;
            let callbacks = {
              getExprValue: () => {
                counter += 1;
                return Promise.resolve(true);
              }
            };
            hookExpr('$test_method', callbacks);
            return tm.run(t, context).then((result) => {
              chai.expect(result).eql(false);
            }).catch((err) => {
              chai.expect(err).eql(false);
            });
          });

          it('/multiple actions can run', () => {
            const context =  {};
            const t = {
              parent_trigger_ids: [],
              trigger_id: 'trigger-test',
              ttl: 3600,
              condition: null,
              actions: [
                ['$log', ['this message']], ['$test_method', []]
              ]
            };
            let counter = 0;
            let callbacks = {
              getExprValue: () => {
                counter += 1;
                return Promise.resolve(true);
              }
            };
            hookExpr('$test_method', callbacks);
            return tm.run(t, context).then((result) => {
              chai.expect(counter).eql(1);
            });
          });

          it('/multiple actions can run 2', () => {
            const context =  {};
            const t = {
              parent_trigger_ids: [],
              trigger_id: 'trigger-test',
              ttl: 3600,
              condition: null,
              actions: [
                ['$test_method_num_2', []], ['$test_method', []]
              ]
            };
            let counter = 0;
            let callbacks = {
              getExprValue: () => {
                counter += 1;
                return Promise.resolve(true);
              }
            };
            hookExpr('$test_method', callbacks);
            hookExpr('$test_method_num_2', callbacks);
            return tm.run(t, context).then((result) => {
              chai.expect(counter).eql(2);
            });
          });

          it('/if first operation fails cannot run any', () => {
            const context =  {};
            const t = {
              parent_trigger_ids: [],
              trigger_id: 'trigger-test',
              ttl: 3600,
              condition: null,
              actions: [
                ['$op_not_exist', ['this message']], ['$test_method', []]
              ]
            };
            let counter = 0;
            let callbacks = {
              getExprValue: () => {
                counter += 1;
                return Promise.resolve(true);
              }
            };
            hookExpr('$test_method', callbacks);
            return tm.run(t, context).then((result) => {
              chai.expect(counter).eql(0);
            }).catch((err) => {
              chai.expect(err).eql(false);
            });
          });


          it('/if first operation fails cannot run any 2', () => {
            const context =  {};
            const t = {
              parent_trigger_ids: [],
              trigger_id: 'trigger-test',
              ttl: 3600,
              condition: null,
              actions: [
                ['$test_method', []], ['$op_not_exist', ['this message']]
              ]
            };
            let counter = 0;
            let callbacks = {
              getExprValue: () => {
                counter += 1;
                return Promise.resolve(true);
              }
            };
            hookExpr('$test_method', callbacks);
            return tm.run(t, context).then((result) => {
              chai.expect(counter).eql(0);
            }).catch((err) => {
              chai.expect(err).eql(false);
            });
          });

          it('/check lazy evaluation is working fine for and 1', () => {
            const context =  {};
            const cond = [
              '$and', [
                ['$ret_true', []],
                ['$ret_false', []],
                ['$ret_true', []]
              ]
            ];
            const t = {
              parent_trigger_ids: [],
              trigger_id: 'trigger-test',
              ttl: 3600,
              condition: cond,
              actions: []
            };
            let trueCounter = 0;
            let retTrueCallbacks = {
              getExprValue: () => {
                trueCounter += 1;
                return Promise.resolve(true);
              }
            };
            let falseCounter = 0;
            let retFalseCallbacks = {
              getExprValue: () => {
                falseCounter += 1;
                return Promise.resolve(false);
              }
            };
            hookExpr('$ret_true', retTrueCallbacks);
            hookExpr('$ret_false', retFalseCallbacks);
            return tm.run(t, context).then((result) => {
              chai.expect(trueCounter, 'true counter').eql(1);
              chai.expect(falseCounter, 'false counter').eql(1);
            });
          });

          it('/check lazy evaluation is working fine for and 2', () => {
            const context =  {};
            const cond = [
              '$and', [
                ['$ret_true', []],
                ['$ret_true', []],
                ['$ret_true', []],
                ['$ret_false', []],
                ['$ret_true', []]
              ]
            ];
            const t = {
              parent_trigger_ids: [],
              trigger_id: 'trigger-test',
              ttl: 3600,
              condition: cond,
              actions: []
            };
            let trueCounter = 0;
            let retTrueCallbacks = {
              getExprValue: () => {
                trueCounter += 1;
                return Promise.resolve(true);
              }
            };
            let falseCounter = 0;
            let retFalseCallbacks = {
              getExprValue: () => {
                falseCounter += 1;
                return Promise.resolve(false);
              }
            };
            hookExpr('$ret_true', retTrueCallbacks);
            hookExpr('$ret_false', retFalseCallbacks);
            return tm.run(t, context).then((result) => {
              chai.expect(trueCounter, 'true counter').eql(3);
              chai.expect(falseCounter, 'false counter').eql(1);
            });
          });

          it('/check lazy evaluation is working fine for or 1', () => {
            const context =  {};
            const cond = [
              '$or', [
                ['$ret_true', []],
                ['$ret_true', []],
                ['$ret_true', []],
                ['$ret_false', []],
                ['$ret_true', []]
              ]
            ];
            const t = {
              parent_trigger_ids: [],
              trigger_id: 'trigger-test',
              ttl: 3600,
              condition: cond,
              actions: []
            };
            let trueCounter = 0;
            let retTrueCallbacks = {
              getExprValue: () => {
                trueCounter += 1;
                return Promise.resolve(true);
              }
            };
            let falseCounter = 0;
            let retFalseCallbacks = {
              getExprValue: () => {
                falseCounter += 1;
                return Promise.resolve(false);
              }
            };
            hookExpr('$ret_true', retTrueCallbacks);
            hookExpr('$ret_false', retFalseCallbacks);
            return tm.run(t, context).then((result) => {
              chai.expect(trueCounter, 'true counter').eql(1);
              chai.expect(falseCounter, 'false counter').eql(0);
            });
          });

          it('/check lazy evaluation is working fine for or 2', () => {
            const context =  {};
            const cond = [
              '$or', [
                ['$ret_false', []],
                ['$ret_false', []],
                ['$ret_true', []],
                ['$ret_false', []],
                ['$ret_true', []]
              ]
            ];
            const t = {
              parent_trigger_ids: [],
              trigger_id: 'trigger-test',
              ttl: 3600,
              condition: cond,
              actions: []
            };
            let trueCounter = 0;
            let retTrueCallbacks = {
              getExprValue: () => {
                trueCounter += 1;
                return Promise.resolve(true);
              }
            };
            let falseCounter = 0;
            let retFalseCallbacks = {
              getExprValue: () => {
                falseCounter += 1;
                return Promise.resolve(false);
              }
            };
            hookExpr('$ret_true', retTrueCallbacks);
            hookExpr('$ret_false', retFalseCallbacks);
            return tm.run(t, context).then((result) => {
              chai.expect(trueCounter, 'true counter').eql(1);
              chai.expect(falseCounter, 'false counter').eql(2);
            });
          });

          it('/check the operation cache is working properly', () => {
            const context =  {};
            const cond = [
              '$or', [
                ['$ret_false', [], 100],
                ['$ret_true', []],
              ]
            ];
            const t = {
              parent_trigger_ids: [],
              trigger_id: 'trigger-test',
              ttl: 3600,
              condition: cond,
              actions: []
            };
            let trueCounter = 0;
            let retTrueCallbacks = {
              getExprValue: () => {
                trueCounter += 1;
                return Promise.resolve(true);
              }
            };
            let falseCounter = 0;
            let retFalseCallbacks = {
              getExprValue: () => {
                falseCounter += 1;
                return Promise.resolve(false);
              }
            };
            hookExpr('$ret_true', retTrueCallbacks);
            hookExpr('$ret_false', retFalseCallbacks);
            return tm.run(t, context).then((result) => {
              chai.expect(trueCounter, 'true counter').eql(1);
              chai.expect(falseCounter, 'false counter').eql(1);
              trueCounter = 0;
              falseCounter = 0;
              return tm.run(t, context).then((result) => {
                chai.expect(trueCounter, 'true counter').eql(1);
                chai.expect(falseCounter, 'false counter').eql(0);
              });
            });
          });

          it('/check the operation cache is working properly 2', () => {
            const context =  {};
            const cond = [
              '$or', [
                ['$ret_false', [], 100],
                ['$ret_true', [], 100],
              ]
            ];
            const t = {
              parent_trigger_ids: [],
              trigger_id: 'trigger-test',
              ttl: 3600,
              condition: cond,
              actions: []
            };
            let trueCounter = 0;
            let retTrueCallbacks = {
              getExprValue: () => {
                trueCounter += 1;
                return Promise.resolve(true);
              }
            };
            let falseCounter = 0;
            let retFalseCallbacks = {
              getExprValue: () => {
                falseCounter += 1;
                return Promise.resolve(false);
              }
            };
            hookExpr('$ret_true', retTrueCallbacks);
            hookExpr('$ret_false', retFalseCallbacks);
            return tm.run(t, context).then((result) => {
              chai.expect(trueCounter, 'true counter').eql(1);
              chai.expect(falseCounter, 'false counter').eql(1);
              trueCounter = 0;
              falseCounter = 0;
              return tm.run(t, context).then((result) => {
                chai.expect(trueCounter, 'true counter').eql(0);
                chai.expect(falseCounter, 'false counter').eql(0);
              });
            });
          });

          it('/check the operation cache is working properly 3', () => {
            const context =  {};
            const cond = [
              '$or', [
                ['$ret_false', []],
                ['$ret_true', []],
              ], 100
            ];
            const t = {
              parent_trigger_ids: [],
              trigger_id: 'trigger-test',
              ttl: 3600,
              condition: cond,
              actions: []
            };
            let trueCounter = 0;
            let retTrueCallbacks = {
              getExprValue: () => {
                trueCounter += 1;
                return Promise.resolve(true);
              }
            };
            let falseCounter = 0;
            let retFalseCallbacks = {
              getExprValue: () => {
                falseCounter += 1;
                return Promise.resolve(false);
              }
            };
            hookExpr('$ret_true', retTrueCallbacks);
            hookExpr('$ret_false', retFalseCallbacks);
            return tm.run(t, context).then((result) => {
              chai.expect(trueCounter, 'true counter').eql(1);
              chai.expect(falseCounter, 'false counter').eql(1);
              trueCounter = 0;
              falseCounter = 0;
              return tm.run(t, context).then((result) => {
                chai.expect(trueCounter, 'true counter').eql(0);
                chai.expect(falseCounter, 'false counter').eql(0);
              });
            });
          });

          it('/check the operation cache ttl is working properly', () => {
            const context =  {};
            const cond = [
              '$or', [
                ['$ret_false', [], 100],
                ['$ret_true', []],
              ]
            ];
            const t = {
              parent_trigger_ids: [],
              trigger_id: 'trigger-test',
              ttl: 3600,
              condition: cond,
              actions: []
            };
            let trueCounter = 0;
            let retTrueCallbacks = {
              getExprValue: () => {
                trueCounter += 1;
                return Promise.resolve(true);
              }
            };
            let falseCounter = 0;
            let retFalseCallbacks = {
              getExprValue: () => {
                falseCounter += 1;
                return Promise.resolve(false);
              }
            };
            hookExpr('$ret_true', retTrueCallbacks);
            hookExpr('$ret_false', retFalseCallbacks);
            currentTS = 1000;
            mockedTimestamp = currentTS / 1000;
            return tm.run(t, context).then((result) => {
              chai.expect(trueCounter, 'true counter').eql(1);
              chai.expect(falseCounter, 'false counter').eql(1);
              trueCounter = 0;
              falseCounter = 0;
              currentTS += 99 * 1000;
              mockedTimestamp = currentTS / 1000;
              return tm.run(t, context).then((result) => {
                chai.expect(trueCounter, 'true counter').eql(1);
                chai.expect(falseCounter, 'false counter').eql(0);
                trueCounter = 0;
                falseCounter = 0;
                currentTS += 99 * 1000;
                return tm.run(t, context).then((result) => {
                  chai.expect(trueCounter, 'true counter').eql(1);
                  chai.expect(falseCounter, 'false counter').eql(1);
                });
              });
            });
          });

          // TODO: tests:
          // - different engine version doesnt run
          // - trigger machinery test cases
          // - different syntax checks on the "triggers language", proper and not
          //   proper syntax cases
          //
          // - operations and arguments are properly passed
          // - no conditions (context):
          //  - simple action work
          //  - multiple actions are properly executed
          //
        });
      });

       // - operations are properly executed (each one context)
      // describe('#operations tests', function () {
      //   context('if_pref operation', function () {
      //     let op;
      //     beforeEach(function () {
      //       const opEx = new OperationExecutor();
      //       op = opEx.operations['$if_pref'];
      //     });

      //     it('check exists', () => {
      //       chai.expect(op).to.exist;
      //     });

      //   });
      // });

    });
  }
);

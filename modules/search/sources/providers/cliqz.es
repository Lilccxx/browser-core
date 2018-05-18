import Rx from '../../platform/lib/rxjs';
import utils from '../../core/utils';
import BackendProvider from './backend';
import { getResponse, getEmptyResponse } from '../responses';
import { addCompletion } from '../operators/results/utils';
import { handleQuerySuggestions } from '../../platform/query-suggestions';

const OFFERS_PROVIDER_ID = 'cliqz::offers';

export default class Cliqz extends BackendProvider {
  constructor() {
    super('cliqz');
    this.cache = new Map();
  }

  fetch(q, { resultOrder }) {
    return utils.getBackendResults(q, { resultOrder })
      .then(e => e.response)
      .catch(error => ({ q, results: [], error }));
  }

  // TODO: fix me
  getEmptySearch(config) {
    return Rx.Observable.from([
      getEmptyResponse(this.id, config),
      getEmptyResponse(OFFERS_PROVIDER_ID, config),
    ]);
  }

  search(query, config, params) {
    if (!query) {
      return this.getEmptySearch(config);
    }

    const { providers: { cliqz: { includeOffers } = {} } = {} } = config;

    const cliqz$ = Rx.Observable
      .fromPromise(this.fetch(query, params))
      .share();

    cliqz$.subscribe(({ q, suggestions }) => handleQuerySuggestions(q, suggestions));

    const results$ = cliqz$
      .map(({ results = [] }) => getResponse(
        this.id,
        config,
        query,
        this.mapResults(results, query),
        'done',
      ))
      .let(this.getOperators());

    // offers are optionally included depending on config;
    // if included, any consumer of `search` needs to split
    // the returned stream

    const offersProvider = Object.assign({}, this, { id: OFFERS_PROVIDER_ID });
    const offers$ = cliqz$
      .map(({ offers = [] }) => getResponse(
        OFFERS_PROVIDER_ID,
        config,
        query,
        this.mapResults(offers, query),
        'done',
      ))
      .let(this.getOperators.call(offersProvider, config));

    return Rx.Observable
      .merge(
        results$,
        includeOffers ? offers$ : Rx.Observable.empty(),
      )
      .map(response => ({
        ...response,
        results: addCompletion(response.results, query),
      }))
      // TODO: check if this is really needed
      .delay(0);
  }
}

import logger from '../logger';
import { getMainLink } from './normalize';

// TODO: should this be a RX subject? A pipeline step? Maybe a hot observable?
class Enricher {
  constructor() {
    this.cache = new Map();
  }

  // TODO: enrich before collecting (i.e., only for new results);
  //       note: history might come after backend
  connect(target, source) {
    // FIXME: this is never unsubscribed from!
    return target
      .combineLatest(source.startWith({ results: [] }))
      .map(this.enrich.bind(this));
  }

  /*
   * Adds rich data from one to the other response. For example, enriches
   * history results with data from backend results.
   *
   * @param {Object} response - The response to enrich.
   * @param {Object} source - The response to take rich data from.
   */
  enrich([{ results, ...response }, source]) {
    const sources = new Map();
    source.results
      .map(result => [
        getMainLink(result),
        result,
      ])
      .forEach(([main, result]) => sources.set(main && main.meta.url, result));
    const enriched = {
      results: results.map((result) => {
        // TODO: assumes there is a 'main' link and that it's the first
        const [main, ...others] = result.links;
        const url = main.meta.url;

        const match = this.cache.get(url) || sources.get(url);
        if (!match) {
          return result;
        }
        logger.debug(`Enrich '${url}' (cached: ${this.cache.has(url)})`,
          result, match);

        const matchMainLink = getMainLink(match);

        const updated = {
          ...result,
          links: [
            {
              ...matchMainLink,
              style: [main.style, matchMainLink.style].filter(Boolean).join(' '),
              provider: main.provider,
              kind: main.kind,
              text: main.text,
              extra: {
                ...matchMainLink.extra,
                ...main.extra,
              },
              meta: {
                ...main.meta,
                originalUrl: main.url,
                isEnriched: true,
              },
            },
            ...others,
            // TODO: assumes 'main' link is first
            // TODO: has also kind 'H', why?
            ...match.links.slice(1),
          ]
        };
        this.cache.set(url, match);
        return updated;
      }),
      ...response,
    };
    return enriched;
  }

  // TODO: hook up to search session start or end
  clear() {
    this.cache.clear();
  }
}

export default Enricher;

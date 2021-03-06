
// From: https://stackoverflow.com/a/43053803
const f = (a, b) => [].concat(...a.map(d => b.map(e => [].concat(d, e))));
const cartesian = (a, b, ...c) => (b ? cartesian(f(a, b), ...c) : a);

function mkFreshtabSchema(members, hasIndex, extra = {}) {
  const properties = {};
  for (let i = 0; i < members.length; i += 1) {
    const { key, value } = members[i];
    properties[key] = {
      type: 'string',
      enum: [value],
    };
  }

  if (hasIndex) {
    properties.index = { type: 'integer', minimum: 0, maximum: 100 };
  }

  return {
    name: `freshtab.${members.map(({ value }) => value).filter(v => v).join('.')}`,
    sendToBackend: false,
    schema: {
      properties: {
        ...properties,
        ...extra,
      },
    },
  };
}

export const NEWS_EDITIONS = [
  'de',
  'de-tr-en',
  'es',
  'fr',
  'gb',
  'intl',
  'it',
  'pl',
  'us',
];

export default [
  {
    name: 'freshtab.prefs.state',
    schema: {
      properties: {
        active: { type: 'boolean' },
      },
    },
  },
  {
    name: 'freshtab.prefs.blueTheme',
    schema: {
      properties: {
        enabled: { type: 'boolean' },
      },
    },
  },
  {
    name: 'freshtab.prefs.config',
    schema: {
      properties: {
        components: { type: 'object' },
        historyDials: {
          properties: {
            visible: { type: 'boolean' },
          },
        },
        customDials: {
          properties: {
            visible: { type: 'boolean' },
          },
        },
        search: {
          properties: {
            visible: { type: 'boolean' },
          },
        },
        news: {
          properties: {
            visible: { type: 'boolean' },
            preferedCountry: { type: 'string' },
          },
        },
        background: {
          properties: {
            image: { type: 'string' },
          },
        },
      }
    },
  },

  // The following schemas are generated using a helper function, since they
  // all have a similar structure. A call of the function `mkFreshtabSchema`
  // such as:
  //
  //  mkFreshtabSchema([
  //    { key: 'type', value: 'home' },
  //    { key: 'action', value: 'show' },
  //  ], true),
  //
  //  Will result in the JSON schema:
  //
  //  {
  //    properties: {
  //      type: { type: 'string', enum: ['home'] },
  //      action: { type: 'string', enum: ['action'] },
  //      index: { type: 'integer', minimum: 0 },
  //    },
  //  }
  //
  //  The second argument of `mkFreshtabSchema` is a boolean which indicates if
  //  a property `index` should be added as well. Some metrics have an index
  //  (e.g.: 'freshtab.home.click.topnews') and some do not (e.g.:
  //  'freshtab.home.show').
  //
  //  Last but not least, the name of the schema is automatically derived in the
  //  following way from the keys: 'type', 'action', 'target'. For example, the
  //  name for the following metric:
  //
  //  {
  //    type: 'home',
  //    action: 'click',
  //    target: 'topnews',
  //    index: 0,
  //  }
  //
  //  Would be: 'freshtab.home.click.topnews'
  //             ^        ^    ^     ^ target
  //             |        |    | action
  //             |        | type
  //             | prefix for all freshtab metrics
  mkFreshtabSchema([
    { key: 'type', value: 'home' },
    { key: 'action', value: 'show' },
  ], false),

  mkFreshtabSchema([
    { key: 'type', value: 'home' },
    { key: 'action', value: 'blur' },
  ], false),

  mkFreshtabSchema([
    { key: 'type', value: 'home' },
    { key: 'action', value: 'focus' },
  ], false),

  mkFreshtabSchema([
    { key: 'type', value: 'home' },
    { key: 'action', value: 'hide' },
  ], false),

  // Settings button
  // =========
  mkFreshtabSchema([
    { key: 'type', value: 'home' },
    { key: 'action', value: 'click' },
    { key: 'target', value: 'settings' },
  ], false),

  // History button
  // =========
  mkFreshtabSchema([
    { key: 'type', value: 'home' },
    { key: 'action', value: 'click' },
    { key: 'target', value: 'history' },
  ], false),

  // Worldcup button
  // =========
  mkFreshtabSchema([
    { key: 'type', value: 'home' },
    { key: 'action', value: 'click' },
    { key: 'target', value: 'worldcup' },
  ], false),

  // World cup tooltip
  // ============
  mkFreshtabSchema([
    { key: 'type', value: 'worldcup.notification' },
    { key: 'action', value: 'click' },
    { key: 'target', value: 'group.later' },
  ], false),
  mkFreshtabSchema([
    { key: 'type', value: 'worldcup.notification' },
    { key: 'action', value: 'click' },
    { key: 'target', value: 'knockout.later' },
  ], false),
  mkFreshtabSchema([
    { key: 'type', value: 'worldcup.notification' },
    { key: 'action', value: 'click' },
    { key: 'target', value: 'knockout.close' },
  ], false),
  mkFreshtabSchema([
    { key: 'type', value: 'worldcup.notification' },
    { key: 'action', value: 'click' },
    { key: 'target', value: 'group.close' },
  ], false),
  mkFreshtabSchema([
    { key: 'type', value: 'worldcup.notification' },
    { key: 'action', value: 'show' },
    { key: 'target', value: 'group' },
  ], false),
  mkFreshtabSchema([
    { key: 'type', value: 'worldcup.notification' },
    { key: 'action', value: 'show' },
    { key: 'target', value: 'knockout' },
  ], false),
  mkFreshtabSchema([
    { key: 'type', value: 'worldcup.notification' },
    { key: 'action', value: 'click' },
    { key: 'target', value: 'knockout.explore' },
  ], false),
  mkFreshtabSchema([
    { key: 'type', value: 'worldcup.notification' },
    { key: 'action', value: 'click' },
    { key: 'target', value: 'group.explore' },
  ], false),

  // Top Sites
  // =========
  mkFreshtabSchema([
    { key: 'type', value: 'home' },
    { key: 'action', value: 'click' },
    { key: 'target', value: 'topsite' },
  ], true),
  mkFreshtabSchema([
    { key: 'type', value: 'home' },
    { key: 'action', value: 'click' },
    { key: 'target', value: 'delete_topsite' },
  ], true),

  // Favorites
  // =========
  mkFreshtabSchema([
    { key: 'type', value: 'home' },
    { key: 'action', value: 'click' },
    { key: 'target', value: 'favorite' },
  ], true),
  mkFreshtabSchema([
    { key: 'type', value: 'home' },
    { key: 'action', value: 'click' },
    { key: 'target', value: 'add_favorite' },
  ], true),
  mkFreshtabSchema([
    { key: 'type', value: 'home' },
    { key: 'action', value: 'click' },
    { key: 'target', value: 'delete_favorite' },
  ], true),

  // Search bar
  // ==========
  mkFreshtabSchema([
    { key: 'type', value: 'home' },
    { key: 'action', value: 'focus' },
    { key: 'target', value: 'search_bar' },
  ], false),
  mkFreshtabSchema([
    { key: 'type', value: 'home' },
    { key: 'action', value: 'blur' },
    { key: 'target', value: 'search_bar' },
  ], false),

  // News
  // ====
  mkFreshtabSchema([
    { key: 'type', value: 'home' },
    { key: 'action', value: 'click' },
    { key: 'target', value: 'news_pagination' },
  ], true),

  // Offers
  // ======
  mkFreshtabSchema([
    { key: 'type', value: 'offrz' },
    { key: 'action', value: 'show' },
  ], false),

  mkFreshtabSchema([
    { key: 'type', value: 'offrz' },
    { key: 'action', value: 'click' },
    { key: 'target', value: 'use' }
  ], false),

  mkFreshtabSchema([
    { key: 'type', value: 'offrz' },
    { key: 'action', value: 'click' },
    { key: 'target', value: 'copy_code' }
  ], false),

  mkFreshtabSchema([
    { key: 'type', value: 'offrz' },
    { key: 'action', value: 'click' },
    { key: 'target', value: 'remove_offer' }
  ], false),

  mkFreshtabSchema([
    { key: 'type', value: 'offrz' },
    { key: 'action', value: 'click' },
    { key: 'target', value: 'remove' }
  ], false),


  // Generate all possible combinations of schemas for interactions with news:
  ...cartesian(
    ['click', 'hover'], // action
    ['topnews', 'breakingnews', 'yournews'], // target
  ).map(([action, target]) => mkFreshtabSchema([
    { key: 'type', value: 'home' },
    { key: 'action', value: action },
    { key: 'target', value: target },
  ], true, {
    edition: {
      type: 'string',
      enum: NEWS_EDITIONS,
    },
  })),
];

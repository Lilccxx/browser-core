import React from 'react';
import PropTypes from 'prop-types';
import Switch from './switch';
import BackgroundImage from './background-image';
import t from '../i18n';
import { settingsCloseSignal, settingsBackgroundSelectSignal } from '../services/telemetry/settings';
import { NO_BG } from '../services/background-image';

export default class Settings extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      componentsState: {
        historyDials: {},
        customDials: {},
        search: {},
        news: {},
        background: {},
      },
    };
    this.onBackgroundImageChanged = this.onBackgroundImageChanged.bind(this);
    this.onNewsSelectionChanged = this.onNewsSelectionChanged.bind(this);
  }

  componentWillReceiveProps(nextProps) {
    this.setState({ componentsState: nextProps.componentsState });
  }

  onBackgroundImageChanged(bg) {
    settingsBackgroundSelectSignal(bg);
    this.props.onBackgroundImageChanged(bg);
  }

  onNewsSelectionChanged(changeEvent) {
    this.props.onNewsSelectionChanged(changeEvent.target.value);
  }

  onCloseButtonClick() {
    settingsCloseSignal();
    this.props.toggle();
  }


  render() {
    /* eslint-disable jsx-a11y/no-static-element-interactions */
    return (
      <div>
        <div
          id="settings-panel"
          className={(this.props.isOpen ? 'visible ' : '')}
        >
          <button
            onClick={() => this.onCloseButtonClick()}
            tabIndex="-1"
            className="close"
          >
            Close
          </button>
          <div className="settings-header">
            <h1>{t('app_settings_header')}</h1>
          </div>

          {this.props.isBlueThemeSupported &&
            <div className="settings-row">
              <span className="label">Cliqz Theme</span>
              <Switch
                name="blueTheme"
                isChecked={this.props.blueTheme}
                toggleComponent={() => this.props.toggleBlueTheme()}
              />
            </div>
          }

          <div className="settings-row">
            <span className="label">{t('app_settings_background_label')}</span>
            <Switch
              name="background"
              isChecked={this.state.componentsState.background.image !== NO_BG}
              toggleComponent={() => this.props.toggleBackground()}
            />
          </div>
          {this.state.componentsState.background.image === NO_BG ? (
            ''
          ) : (
            <div className="settings-row">
              <ul className="background-selection-list">
                {this.props.isBlueBackgroundSupported &&
                <li>
                  <BackgroundImage
                    onBackgroundImageChanged={this.onBackgroundImageChanged}
                    bg="bg-blue"
                    src="./images/bg-alps-thumbnail.png"
                    isActive={this.state.componentsState.background.image === 'bg-blue' ||
                      !this.state.componentsState.background.image
                    }
                  />
                </li>
                }
                <li>
                  <BackgroundImage
                    onBackgroundImageChanged={this.onBackgroundImageChanged}
                    bg="bg-light"
                    src="./images/bg-light-thumbnail.png"
                    isActive={this.state.componentsState.background.image === 'bg-light'}
                  />
                </li>
                <li>
                  <BackgroundImage
                    onBackgroundImageChanged={this.onBackgroundImageChanged}
                    bg="bg-dark"
                    src="./images/bg-dark-thumbnail.png"
                    isActive={this.state.componentsState.background.image === 'bg-dark'}
                  />
                </li>
                <li>
                  <BackgroundImage
                    onBackgroundImageChanged={this.onBackgroundImageChanged}
                    bg="bg-winter"
                    src="./images/bg-winter-thumbnail.png"
                    isActive={this.state.componentsState.background.image === 'bg-winter'}
                  />
                </li>
                <li>
                  <BackgroundImage
                    onBackgroundImageChanged={this.onBackgroundImageChanged}
                    bg="bg-matterhorn"
                    src="./images/bg-matterhorn-thumbnail.png"
                    isActive={this.state.componentsState.background.image === 'bg-matterhorn'}
                  />
                </li>
                <li>
                  <BackgroundImage
                    onBackgroundImageChanged={this.onBackgroundImageChanged}
                    bg="bg-spring"
                    src="./images/bg-spring-thumbnail.png"
                    isActive={this.state.componentsState.background.image === 'bg-spring'}
                  />
                </li>
                <li>
                  <BackgroundImage
                    onBackgroundImageChanged={this.onBackgroundImageChanged}
                    bg="bg-worldcup"
                    src="./images/bg-worldcup-thumbnail.png"
                    isActive={this.state.componentsState.background.image === 'bg-worldcup'}
                  />
                </li>
                <li>
                  <BackgroundImage
                    onBackgroundImageChanged={this.onBackgroundImageChanged}
                    bg="bg-summer"
                    src="./images/bg-summer-thumbnail.png"
                    isActive={this.state.componentsState.background.image === 'bg-summer'}
                  />
                </li>
              </ul>
            </div>
          )
          }

          <div className="settings-row">
            <span className="label">{t('app_settings_most_visited_label')}</span>
            <Switch
              isChecked={this.state.componentsState.historyDials.visible}
              toggleComponent={() => this.props.toggleComponent('historyDials')}
            />
            <button
              className="link"
              tabIndex="-1"
              disabled={!this.props.hasHistorySpeedDialsToRestore}
              onClick={() => this.props.restoreHistorySpeedDials()}
            >
              {t('app_settings_most_visited_restore')}
            </button>
          </div>

          <div className="settings-row">
            <span className="label">{t('app_settings_favorites_label')}</span>
            <Switch
              isChecked={this.state.componentsState.customDials.visible}
              toggleComponent={() => this.props.toggleComponent('customDials')}
            />
          </div>

          <div className="settings-row">
            <span className="label">{t('app_settings_search_label')}</span>
            <Switch
              isChecked={this.state.componentsState.search.visible}
              toggleComponent={() => this.props.toggleComponent('search')}
            />
          </div>

          <div className="settings-row">
            <div>
              <span className="label">{t('app_settings_news_label')}</span>
              <Switch
                isChecked={this.state.componentsState.news.visible}
                toggleComponent={() => this.props.toggleComponent('news')}
              />
            </div>
            {!this.state.componentsState.news.visible ? (
              ''
            ) : (
              <div>
                <form>
                  <div className="radio">
                    <label htmlFor="news-radio-selector-2">
                      <input
                        type="radio"
                        tabIndex="-1"
                        name="news"
                        id="news-radio-selector-2"
                        value="de"
                        checked={this.state.componentsState.news.preferedCountry === 'de'}
                        onChange={this.onNewsSelectionChanged}
                      />
                      {t('app_settings_news_language_de')}
                    </label>
                  </div>
                  <div className="radio">
                    <label htmlFor="news-radio-selector-5">
                      <input
                        type="radio"
                        tabIndex="-1"
                        name="news"
                        id="news-radio-selector-5"
                        value="de-tr-en"
                        checked={this.state.componentsState.news.preferedCountry === 'de-tr-en'}
                        onChange={this.onNewsSelectionChanged}
                      />
                      {t('app_settings_news_language_de_tr_en')}
                    </label>
                  </div>
                  <div className={this.props.focusNews ? 'focused radio' : 'radio'}>
                    <label htmlFor="news-radio-selector-3">
                      <input
                        type="radio"
                        tabIndex="-1"
                        name="news"
                        id="news-radio-selector-3"
                        value="fr"
                        checked={this.state.componentsState.news.preferedCountry === 'fr'}
                        onChange={this.onNewsSelectionChanged}
                      />
                      {t('app_settings_news_language_fr')}
                    </label>
                  </div>
                  <div className="radio">
                    <label htmlFor="news-radio-selector-4">
                      <input
                        type="radio"
                        tabIndex="-1"
                        name="news"
                        id="news-radio-selector-4"
                        value="intl"
                        checked={this.state.componentsState.news.preferedCountry === 'intl'}
                        onChange={this.onNewsSelectionChanged}
                      />
                      {t('app_settings_news_language_en')}
                    </label>
                  </div>
                  <div className="radio">
                    <label htmlFor="news-radio-selector-6">
                      <input
                        type="radio"
                        tabIndex="-1"
                        name="news"
                        id="news-radio-selector-6"
                        value="us"
                        checked={this.state.componentsState.news.preferedCountry === 'us'}
                        onChange={this.onNewsSelectionChanged}
                      />
                      {t('app_settings_news_language_us')}
                    </label>
                  </div>
                  <div className="radio">
                    <label htmlFor="news-radio-selector-7">
                      <input
                        type="radio"
                        tabIndex="-1"
                        name="news"
                        id="news-radio-selector-7"
                        value="gb"
                        checked={this.state.componentsState.news.preferedCountry === 'gb'}
                        onChange={this.onNewsSelectionChanged}
                      />
                      {t('app_settings_news_language_gb')}
                    </label>
                  </div>
                </form>
              </div>
            )
            }
          </div>
        </div>
      </div>
    );
    /* eslint-enable jsx-a11y/no-static-element-interactions */
  }
}

Settings.propTypes = {
  onBackgroundImageChanged: PropTypes.func,
  onNewsSelectionChanged: PropTypes.func,
  toggle: PropTypes.func,
  isOpen: PropTypes.bool,
  focusNews: PropTypes.bool,
  blueTheme: PropTypes.bool,
  isBlueThemeSupported: PropTypes.func,
  isBlueBackgroundSupported: PropTypes.func,
  toggleComponent: PropTypes.func,
  toggleBlueTheme: PropTypes.func,
  toggleBackground: PropTypes.func,
  restoreHistorySpeedDials: PropTypes.func,
  hasHistorySpeedDialsToRestore: PropTypes.bool,
};

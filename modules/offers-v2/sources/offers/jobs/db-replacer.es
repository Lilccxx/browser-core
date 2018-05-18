import OfferJob from './job';
import Offer from '../offer';
import logger from '../../common/offers_v2_logger';


/**
 * Replace all offers in db if we have a new version
 */
const replaceOffersOnDB = (offerList, offersDB) => {
  const result = [];
  offerList.forEach((offer) => {
    if (offersDB.isOfferPresent(offer.uniqueID) &&
        offersDB.getOfferObject(offer.uniqueID).version !== offer.version) {
      // update it and add it to be processed again
      if (!offersDB.updateOfferObject(offer.uniqueID, offer.offerObj)) {
        // EX-7208: we do not add the offer to the resulting list here since it
        // failed to update, still log the issue
        logger.error(`Couldnt update offer on DB for offer id: ${offer.uniqueID}, discarding it`);
      } else {
        // TODO: remove this debug once it is all stable
        result.push(offer);
        logger.debug(`Replacing db offer ${offer.uniqueID} from the backend one`);
      }
    } else {
      // its a new one or is the same than the DB
      result.push(offer);
    }
  });
  return result;
};

const getSameOffersFromDB = (offerList, offersDB) => {
  const resultList = [];
  offerList.forEach((offer) => {
    if (offersDB.isOfferPresent(offer.uniqueID) &&
        offersDB.getOfferObject(offer.uniqueID).version === offer.version) {
      // TODO: remove this debug once it is all stable
      logger.debug(`Replacing backend offer ${offer.uniqueID} from the db one`);
      resultList.push(new Offer(offersDB.getOfferObject(offer.uniqueID)));
    } else {
      resultList.push(offer);
    }
  });
  return resultList;
};

/**
 * will remove all the offers that had been already removed from the DB
 */
const filterOffersAlreadyRemoved = (offerList, offersDB) =>
  offerList.filter(offer => !offersDB.hasOfferRemoved(offer.uniqueID));

/**
 * This job will replace all the current offers we have on the DB with the same
 * id but a different revision number (this will ensure we always have the latest
 * version of the offer).
 * This will also replace the offer from the BE with the one from the DB if the
 * id and version are the same (to ensure not replacing dynamic content)
 */
export default class DBReplacer extends OfferJob {
  constructor() {
    super('DBReplacer');
  }

  process(offerList, { offersDB }) {
    const offersNotYetRemoved = filterOffersAlreadyRemoved(offerList, offersDB);
    const replacedOffers = replaceOffersOnDB(offersNotYetRemoved, offersDB);
    return Promise.resolve(getSameOffersFromDB(replacedOffers, offersDB));
  }
}

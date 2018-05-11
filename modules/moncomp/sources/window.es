import { utils } from '../core/cliqz';
import CliqzMonComp from './moncomp';

export default class Win {
  constructor(settings) {
    this.window = settings.window;
    this.settings = settings.settings;
  }

  init() {
    //CliqzMonComp.init(this.window);
  }

  unload() {
  }

  status() {
    return {
      visible: utils.getPref('moncomp_endpoint', false),
      state: utils.getPref('moncomp_endpoint', false),
    }
  }

}

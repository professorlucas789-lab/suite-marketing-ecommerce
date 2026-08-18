declare const __APP_VERSION__: string;
declare const __BUILD_TIME__: string;
declare const __GIT_COMMIT__: string;
declare const __DEPLOY_TARGET__: string;
declare const __PRODUCTION_URL__: string;

export const buildInfo = Object.freeze({
  appVersion: __APP_VERSION__,
  buildTime: __BUILD_TIME__,
  gitCommit: __GIT_COMMIT__,
  deployTarget: __DEPLOY_TARGET__,
  productionUrl: __PRODUCTION_URL__,
});

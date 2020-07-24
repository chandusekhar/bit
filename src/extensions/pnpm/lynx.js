const supi = require('supi');
const createResolver = require('@pnpm/npm-resolver').default;
const createStore = require('@pnpm/package-store').default;
const createFetcher = require('@pnpm/tarball-fetcher').default;

async function createStoreController(storeDir) {
  const registry = 'https://registry.npmjs.org/';
  const rawConfig = { registry };
  const resolver = createResolver({
    metaCache: new Map(),
    rawConfig,
    storeDir,
  });
  const fetcher = createFetcher({
    rawConfig,
    registry,
  });
  const storeController = await createStore(resolver, fetcher, {
    storeDir,
    verifyStoreIntegrity: true,
  });
  return storeController;
}

async function install(rootPathToManifest, pathsToManifests, storeDir) {
  let packagesToBuild = []; // supi will use this to install the packages
  let workspacePackages = {}; // supi will use this to link packages to eachother
  for (const rootDir in pathsToManifests) {
    let manifest = pathsToManifests[rootDir];
    packagesToBuild.push({
      buildIndex: 0, // workspace components should be installed before the root
      manifest,
      rootDir,
      mutation: 'install',
    });
    workspacePackages[manifest.name] = workspacePackages[manifest.name] || {};
    workspacePackages[manifest.name][manifest.version] = { dir: rootDir, manifest };
  }
  packagesToBuild.push({
    buildIndex: 1, // install the root package after the workspace components were installed
    manifest: rootPathToManifest.manifest,
    mutation: 'install',
    rootDir: rootPathToManifest.rootDir,
  });
  const opts = {
    storeDir,
    dir: rootPathToManifest.rootDir,
    storeController: await createStoreController(storeDir),
    update: true,
    workspacePackages,
  };
  await supi.mutateModules(packagesToBuild, opts);
}

module.exports = install;

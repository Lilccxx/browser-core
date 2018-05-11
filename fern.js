#!/usr/bin/env node

'use strict';

const childProcess = require('child_process');
const os = require('os');

if (process.argv[2] === "install") {
  let command = "npm";
  if (os.platform().indexOf('win') == 0) {
    command += ".cmd"
  }

  // Install npm packages
  const npmInstall = childProcess.spawn(command, ['install'], { stdio: [0,1,2] });
  npmInstall.on('exit', function () {
    const publicSuffixListUpdate = childProcess.spawn(command, ['run', 'tldjs-update-rules'], { stdio: [0,1,2] });
    publicSuffixListUpdate.on('exit', function () {
      fern();
    });
  });
} else {
  fern();
}

function fern() {
const program = require('commander');
const spaws = require('cross-spawn');
const fs = require('fs');
const wrench = require('wrench');
const glob = require('glob');
const colors = require('colors');
const path = require('path')
const rimraf = require('rimraf');
const chalk = require('chalk');
const notifier = require('node-notifier');

const common = require('./fern/commands/common');
require('./fern/commands/build');
require('./fern/commands/serve');
require('./fern/commands/test');
require('./fern/commands/pack');
require('./fern/commands/version');

const setConfigPath = common.setConfigPath;
const getExtensionVersion = common.getExtensionVersion;
const createBuildWatcher = common.createBuildWatcher;
const cleanupDefaultBuild = common.cleanupDefaultBuild;

colors.setTheme({
  silly: 'rainbow',
  input: 'grey',
  verbose: 'cyan',
  prompt: 'grey',
  info: 'green',
  data: 'grey',
  help: 'cyan',
  warn: 'yellow',
  debug: 'blue',
  error: 'red'
});

function isPackageInstalled(pkg, options, msg) {
  var spawned = spaws.sync(pkg, [options], { stderr: 'inherit' });
  if(spawned.error !== null) {
    console.log(chalk.red(msg));
    process.exit(1);
  }
}

program.command('install')
       .action(() => {
          isPackageInstalled('bower', '--silent', 'npm bower package missing, to install it run `npm install bower -g`');

          console.log(chalk.green('Installing project dependencies'));
          spaws.sync('bower', ['install'], { stdio: 'inherit', stderr: 'inherit'});

          console.log(chalk.green('DONE!'))
       });

program.command('addon-id [file]')
       .action((configPath) => {
          setConfigPath(configPath);
          console.log(CONFIG.settings.id || 'cliqz@cliqz.com')
        });

program.command('test-webext')
       .action(() => {
         const cfg = setConfigPath('./configs/cliqzium.json');
         const CONFIG = cfg.CONFIG;
         const OUTPUT_PATH = cfg.OUTPUT_PATH;
         const watcher = createBuildWatcher();
         let runner;

         watcher.on('change', () => {
           notifier.notify({
             title: 'Fern',
             message: 'Build complete',
             time: 1500
           });

           if (runner) {
             runner.kill('SIGTERM');
           }

           runner = childProcess.spawn('node', [path.join(process.cwd(), 'fern/run_selenium_tests.es')]);

           process.on('exit', () => { runner.kill('SIGTERM'); });
         });
       });

program.command('generate <type> <moduleName>')
       .description('available types: module')
       .action((type, moduleName) => {
         if(type !== 'module') {
           console.error(`Error: generate does not support type - '${type}'`);
           return;
         }

         const modulePath = `modules/${moduleName}`;

         try {
           fs.lstatSync(modulePath);

           // lstatSync throws error if Directory does not exist, which is
           // the only situation that generator can work.
           console.log(e);
           console.error(`Error: module '${moduleName}' already exists`);
           return;
         } catch (e) {
         }

         wrench.copyDirSyncRecursive('fern/templates/module', modulePath);

         console.log('installing module');
         glob.sync(modulePath+'/**/*').forEach(path => console.log('  created'.info, path));
       });

program.command('react-dev [config]')
      .description('run the react-native dev server')
      .action((config) => {
        const cfg = setConfigPath(config || 'configs/react-native.json');
        const CONFIG = cfg.CONFIG;
        const OUTPUT_PATH = cfg.OUTPUT_PATH;
        const projectRoots = [OUTPUT_PATH, path.resolve(process.cwd(), 'node_modules')]
        const options = ['./node_modules/react-native/local-cli/cli.js', 'start',
                         '--projectRoots', projectRoots.join(',')]
        spaws.sync('node', options, { stdio: 'inherit', stderr: 'inherit'});
      });

program.parse(process.argv);
}

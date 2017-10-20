#!/usr/bin/env node

'use strict';

const Chalk = require('chalk');
const Utils = require('./utils/utils');
const log = console.log;
const inquirer = require('inquirer');
const adb = require('node-adb-api');

const CHOOSE_WHAT_TO_DO_OPTIONS = [
  'Open', 
  'Uninstall', 
  'Clear Data', 
  'Download APK', 
  'Cancel'
]

let packages;

function showDeviceSelection(devices) {
  inquirer.registerPrompt('autocomplete', require('inquirer-autocomplete-prompt'));
  inquirer.prompt({
    type: 'list',
    name: 'device',
    message: 'Select A device from the connected device?',
    choices: devices
  }).then(selection => {
    let selectedDevice = selection.device.substr(0, selection.device.indexOf(' '));
    showPackageSelection(selectedDevice)
  });
}

function showPackageSelection(deviceSerialNumber) {
  packages = adb.getPackagesByDeviceSerialNumber(deviceSerialNumber);

  if (!adb.isAnyDeviceConnected(deviceSerialNumber)) {
    Utils.titleError(`None or more than one device/emulator connected`);
    process.exit(2);
  }

  inquirer.registerPrompt('autocomplete', require('inquirer-autocomplete-prompt'));
  inquirer.prompt({
    type: 'autocomplete',
    name: 'package',
    pageSize: 10,
    message: 'What package do you want to purrge?',
    source: adb.fuzzySearchPackages
  }).then(packageAnswer => {
    
    inquirer.prompt({
      type: 'list',
      name: 'packageAction',
      message: 'What do you want to do with this app?',
      choices: CHOOSE_WHAT_TO_DO_OPTIONS
    }).then(packageActionAnswer => {
      const chosenPackage = packageAnswer.package;
      const packageAction = packageActionAnswer.packageAction.toLowerCase();

      if (packageAction === 'uninstall') {
        Utils.title(`Uninstalling: ${Chalk.green(chosenPackage)}...`);
        adb.uninstall(chosenPackage, deviceSerialNumber);
      } else if (packageAction === 'clear data') {
        Utils.title(`Clearing data: ${Chalk.green(chosenPackage)}...`);
        adb.clearData(chosenPackage, deviceSerialNumber);
      } else if (packageAction === 'open') {
        Utils.title(`Opening app: ${Chalk.green(chosenPackage)}...`);
        adb.launchApp(chosenPackage, deviceSerialNumber);
      } else if (packageAction === 'download apk') {
        Utils.title(`Downloading apk for: ${Chalk.green(chosenPackage)}...`);
        const fileName = adb.downloadAPK(deviceSerialNumber, chosenPackage);
        log(`Downloaded apk to: ${Chalk.yellow(fileName)}`);
      }
    });
  });
}

function getTheOnlyConnectedDeviceSerial(devices) {
  return devices[0].substr(0, devices[0].indexOf(' '));
}

// Main code //
const self = module.exports = {
  init: (input, flags) => {
    const devices = adb.getListOfDevices();

    if (devices.length === 0) {
      Utils.titleError(`No device/emulator connected \n please connect one or more device/emulator and try again`);
      process.exit(2);
    } else if (devices.length === 1) {
      // only single device is connected proceed with package selection
      const onlyDevice = getTheOnlyConnectedDeviceSerial(devices)

      showPackageSelection(onlyDevice);
    } else {
      // multiple device connected show device selection
      showDeviceSelection(devices);
    }
  }
};

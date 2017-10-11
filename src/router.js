#!/usr/bin/env node
'use strict';

const Chalk = require('chalk');
const Utils = require('./utils/utils');
const log = console.log;
const shell = require('shelljs');
const inquirer = require('inquirer');
const fuzzy = require('fuzzy');

let packages;
let devices;

function getListOfDevices(){
    const command = shell.exec('adb devices -l', { silent: true })
    const packages = command.stdout.split(`\n`)
        .filter(Boolean)
        .filter(item => item.indexOf('daemon not running') === -1)
        .filter(item => item.indexOf('daemon started') === -1)
        .filter(item => item.indexOf('List of devices attached') === -1)
        .map(item => item.replace(`device`, ``))
        .map(item => item.replace(/^\s+|\s+$/g, ""));
    return packages;
}

function getPackages(deviceSerialNumber) {
    const command = shell.exec(`adb -s ${deviceSerialNumber} shell pm list packages`, { silent: true })
    const packages = command.stdout.split(`\n`)
        .filter(Boolean)
        .map(item => item.replace(`package:`, ``))
        .map(item => item.replace(/^\s+|\s+$/g, ""));
    return packages;
}

function searchPackages(answers, input) {
    input = input || '';
    return new Promise(function (resolve) {
        var fuzzyResult = fuzzy.filter(input, packages);
        resolve(fuzzyResult.map(el => el.original));
    });
}

function uninstall(chosenPackage,selectedDevice) {
    shell.exec(`adb -s ${selectedDevice} uninstall ${chosenPackage}`);
}

function clearData(chosenPackage,selectedDevice) {
    shell.exec(`adb -s ${selectedDevice} shell pm clear ${chosenPackage}`);
}

function showDeviceSelection(){
    inquirer.registerPrompt('autocomplete', require('inquirer-autocomplete-prompt'));
    inquirer.prompt({
        type: 'list',
        name: 'device',
        message: 'Select A device from the connected device?',
        choices: devices
    }).then(selection =>{
        let selectedDevice = selection.device.substr(0,selection.device.indexOf(' '));
        showPackageSelection(selectedDevice)
    });
}

function showPackageSelection(selectedDevice){
    packages = getPackages(selectedDevice);

    if (packages.length === 0) {
        Utils.titleError(`None or more than one device/emulator connected`);
        process.exit(2);
    }

    inquirer.registerPrompt('autocomplete', require('inquirer-autocomplete-prompt'));
    inquirer.prompt({
        type: 'autocomplete',
        name: 'package',
        pageSize: 10,
        message: 'What package do you want to purrge?',
        source: searchPackages
    }).then(packageAnswer =>{
        inquirer.prompt({
            type: 'list',
            name: 'packageAction',
            message: 'What do you want to do with this app?',
            choices: ['Uninstall', 'Clear Data', 'Cancel']
        }).then(packageActionAnswer => {
            const chosenPackage = packageAnswer.package;
            const packageAction = packageActionAnswer.packageAction.toLowerCase();

            if (packageAction === 'uninstall') {
                Utils.title(`Uninstalling: ${Chalk.green(chosenPackage)}...`)
                uninstall(chosenPackage,selectedDevice);
            } else if (packageAction === 'clear data') {
                Utils.title(`Clearing data: ${Chalk.green(chosenPackage)}...`)
                clearData(chosenPackage,selectedDevice);
            }
        });
    });
}
// Main code //
const self = module.exports = {
    init: (input, flags) => {
        devices = getListOfDevices();
        if (devices.length === 0){
            Utils.titleError(`No device/emulator connected \n please connect one or more device/emulator and try again`);
            process.exit(2);
        }else if (devices.length === 1){
            //only single device is connected proceed with package selection
            let selectedDevice = devices[0].substr(0,devices[0].indexOf(' '));

            showPackageSelection(selectedDevice);
        }else{
            //multiple device connected show device selection
            showDeviceSelection();
        }
    }
};

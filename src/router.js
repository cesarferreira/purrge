#!/usr/bin/env node
'use strict';

const Chalk = require('chalk');
const Utils = require('./utils/utils');
const log = console.log;
const shell = require('shelljs');
const inquirer = require('inquirer');
const fuzzy = require('fuzzy');

let packages;

function getPackages() {
	const command = shell.exec('adb shell pm list packages', { silent: true })
	const packages = command.stdout.split(`\n`)
		.filter(Boolean)
		.filter(item => item.indexOf('daemon not running') === -1)
		.filter(item => item.indexOf('daemon started') === -1)
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

function uninstall(chosenPackage) {
	shell.exec(`adb uninstall ${chosenPackage}`);
}

function clearData(chosenPackage) {
	shell.exec(`adb shell pm clear ${chosenPackage}`);
}

// Main code //
const self = module.exports = {
	init: (input, flags) => {
		
		packages = getPackages();

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
			const chosenPackage = packageAnswer.package;
			if(flags["clearData"] || flags["d"])
			{
				Utils.title(`Clearing data: ${Chalk.green(chosenPackage)}...`)
				clearData(chosenPackage);
			} else if(flags["uninstall"] || flags["u"])
			{
				Utils.title(`Uninstalling: ${Chalk.green(chosenPackage)}...`)
				uninstall(chosenPackage);
			} else
			{
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
						uninstall(chosenPackage);
					} else if (packageAction === 'clear data') {
						Utils.title(`Clearing data: ${Chalk.green(chosenPackage)}...`)
						clearData(chosenPackage);
					}
				});
			}
		});
	}
};

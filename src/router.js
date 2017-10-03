#!/usr/bin/env node
'use strict';

const Chalk = require('chalk');
const Utils = require('./utils/utils');
const log = console.log;
const shell = require('shelljs');
const inquirer = require('inquirer');
const fuzzy = require('fuzzy');

const SampleTask = require('./tasks/sample_task');

let packages;

function getPackages() {
	const command = shell.exec('adb shell pm list packages', { silent: true })
	const packages = command.stdout.split(`\n`).filter(Boolean)
		.map(item => item.replace(`package:`, ``));
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

// Main code //
const self = module.exports = {
	init: (input, flags) => {
		
		packages = getPackages();

		inquirer.registerPrompt('autocomplete', require('inquirer-autocomplete-prompt'));
		inquirer.prompt({
			type: 'autocomplete',
			name: 'package',
			pageSize: 7,
			message: 'What package do you want to uninstall?',
			source: searchPackages
		}).then(packageAnswer =>{
			inquirer.prompt({
				type: 'list',
				name: 'shouldUninstall',
				message: 'Are you sure you want to UNINSTALL this package?',
				choices: ['Yes', 'No']
			}).then(shouldUninstallAnswer => {
				const chosenPackage = packageAnswer.package;
				const shouldUninstall = shouldUninstallAnswer.shouldUninstall.toLowerCase();

				if (shouldUninstall === 'yes') {
					log(``);
					Utils.title(`Uninstalling: ${Chalk.green(chosenPackage)}...`)
					uninstall(chosenPackage);
				}
			});
		});
	}
};

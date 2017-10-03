#!/usr/bin/env node
'use strict';

const Chalk = require('chalk');
const Utils = require('./utils/utils');
const log = console.log;
const shell = require('shelljs');
const inquirer = require('inquirer');
const _ = require('lodash');
const fuzzy = require('fuzzy');

const SampleTask = require('./tasks/sample_task');

let packages;

function getPackages() {
	const command = shell.exec('adb shell pm list packages', { silent: true })
	const packages = command.stdout.split(`\n`)
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
// Main code //
const self = module.exports = {
	init: (input, flags) => {
		
		packages = getPackages();

		inquirer.registerPrompt('autocomplete', require('inquirer-autocomplete-prompt'));
		inquirer.prompt([{
			type: 'autocomplete',
			name: 'package',
			pageSize: 10,
			suggestOnly: true,
			message: 'What package do you want to uninstall?',
			source: searchPackages
		}, {
			type: 'autocomplete',
			name: 'shouldUninstall',
			message: 'Are you sure you want to UNINSTALL this package?',
			source: function(params) {
				return new Promise(function (resolve) { resolve('yes', 'no') })
			}
		}]).then(function (answers) {
			//etc
			log(answers)
		});
	}
};

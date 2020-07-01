'use strict';

const Chalk = require('chalk');
const exec = require('child_process').execSync;
const readFile = require('fs').readFileSync;

function test () {
    var oCommands = {
        'help': ['--help'],
        'version': ['--version'],
        'without-custom-tags':['tests/fixtures'],
        'with-custom-tags': ['--custom-block','section','--custom-tag','button', 'tests/fixtures']
    };

    for (var sFile in oCommands) {
        var aArguments, oOutput = {}, oContent, sCommand;

        aArguments = oCommands[sFile];
        sCommand = 'node index.js ' + aArguments.join(' ');

        try {
            oOutput.stderr = '';
            oOutput.stdout = exec(sCommand, {stdio: ['pipe','pipe','pipe']}).toString();
        } catch (oException) {
            oOutput.stderr = oException.stderr.toString();
            oOutput.stdout = oException.stdout.toString();
        }

        oContent = {
            stderr: readFile('tests/output/' + sFile + '-stderr.log').toString(),
            stdout: readFile('tests/output/' + sFile + '-stdout.log').toString()
        };

        ['stdout', 'stderr'].forEach(function(sSubject){
          var expected = oContent[sSubject].split('\n').sort().filter(function (el) { return el != ''; });
          var received = oOutput[sSubject].split('\n').sort().filter(function (el) { return el != ''; });
            if (expected.join('') === received.join('')) {
                console.info(Chalk.green('✔') + ' Test ' + sFile + ': passed(for ' + sSubject + ')');
            } else {
                process.exitCode = 3;
                console.error(Chalk.red('✘') + ' Test ' + sFile + ': failed (for ' + sSubject + ')');
// @TODO: Only show a diff instead of full output
                console.log('================================================================================');
                console.log(oOutput[sSubject].trim());
                console.log('--------------------------------------------------------------------------------');
                console.log(oContent[sSubject].trim());
                console.log('================================================================================');
            }
        });
    }
}

test();

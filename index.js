#!/usr/bin/env node

'use strict';

const Chalk = require('chalk');
const Commander = require('commander');
const FileHound = require('filehound');
const FileSystem = require('fs');
const Linter = require('liquid-linter');
const Readline = require('readline');
const Util = require('util');

const EXIT_ERROR_NO_PATH_GIVEN = 65;
const EXIT_ERROR_NOT_EXISTS = 66;
const EXIT_ERROR_LINTER = 67;

var g_aInput = [];

function showFinalMessage(p_iErrorCount, p_iWarningCount) {
    var sErrorCount, sWarningCount;

    sWarningCount = Chalk.yellow('⚠') + ' ' + p_iWarningCount + ' warning' + (p_iWarningCount > 1?'s':'');
    sErrorCount = Chalk.red('✘') + ' ' + p_iErrorCount + ' error' + (p_iErrorCount > 1?'s':'');

    if (p_iErrorCount > 0 && p_iWarningCount > 0) {
        console.error((p_iErrorCount + p_iWarningCount) + ' messages (' + sErrorCount + ', ' + sWarningCount + ')');
    } else if (p_iWarningCount > 0) {
        console.error(sWarningCount);
    } else if (p_iErrorCount > 0) {
        console.error(sErrorCount);
    } else {
        console.info(Chalk.green('✔') + ' no errors');
    }
}

/**
 * @NOTE: This function is only called by Commander if at least one argument is present
 *
 * @param p_aPaths Array
 */
function action (p_aPaths) {
    var iErrorCount = 0, iWarningCount = 0;

    p_aPaths.forEach(function (p_sPath) {

        var oStat, aFiles, oFileHound;
        if (FileSystem.existsSync(p_sPath) === false) {

            process.exitCode = EXIT_ERROR_NOT_EXISTS;

            console.error(Chalk.red.underline(p_sPath));
            var sMessage = Util.format(
                '  %d:%d  %s  %s',
                0,
                0,
                Chalk.red('error'),
                'No such file or directory'
            );
            console.error(sMessage);
            console.log('');

            iErrorCount++;
        } else {
            oStat = FileSystem.statSync(p_sPath);

            if (oStat.isDirectory() === false) {
                aFiles = [p_sPath];
            } else {
                oFileHound = FileHound.create()
                    .paths(p_sPath)
                    .ext(['htm', 'html', 'liquid', 'lqd', 'markdown', 'md'])
                    .ignoreHiddenDirectories()
                    .ignoreHiddenFiles()
                ;

                aFiles = oFileHound.findSync();
            }

            aFiles.forEach(function (p_sFile) {

                Linter.lintFile(p_sFile, function (p_aErrors) {
                    // @FIXME: Use warnings if not errors
                    // console.error(Chalk.yellow.underline(p_sPath));
                    // console.error(' ' + Chalk.yellow('warning') + sMessage);

                    if (p_aErrors.length > 0) {
                        process.exitCode = EXIT_ERROR_LINTER;

                        console.error(Chalk.red.underline(p_sFile));
                        //@TODO: add nice padding to give different lines the same format -> ' '.repeat(4 - (p_oError.location.line + '' +p_oError.location.col).length);
                        p_aErrors.reverse().forEach(function (p_oError) {
                            var sMessage = Util.format(
                                '  %d:%d-%d:%d  %s  %s',
                                p_oError.location.line,
                                p_oError.location.col,
                                p_oError.location.line,
                                p_oError.location.col + p_oError.location.lenght,
                                Chalk.red('error'),
                                p_oError.message.split('\n')[0]
                            );
                            console.error(sMessage);
                            iErrorCount++;
                        });
                        console.log('');
                    } else {
                        console.info(Chalk.green(p_sFile) + ': no issues found');
                    }
                });
            });
        }
    });

    // @TODO: Figure out how to run showFinalMessage as last command
    // showFinalMessage(iErrorCount, iWarningCount);
}

/**
 * Parses the command-line arguments from STDIN/pipe or argument vector (argv)
 */
function parseArguments() {
    var aFileList;

    if (g_aInput.length > 0) {
        aFileList = g_aInput;
    } else {
        aFileList = process.argv;
    }

    Commander.parse(aFileList);
    if (g_aInput.length === 0 && (Commander.args && Commander.args.length === 0)) {
        process.exitCode = EXIT_ERROR_NO_PATH_GIVEN;
        console.error(Chalk.red('Error: ') + Chalk.bold(' no path given'));
        Commander.outputHelp();
    }
}

/* @NOTE: There's a problem in the linter with {% include %} tags. For now related errors are simply ignored. */
process.on('unhandledRejection', function(error/*, promise*/) {
    if (error.name !== 'Liquid.FileSystemError' && error.message === 'This file system doesn\'t allow includes') {
        throw error;
    }
});

Commander
    .version('0.2.0')
    .description('Linter for Liquid template files')
    .arguments('<paths...>')
    // @TODO: Figure out how to accept multiple ignore paths
    // .option('-x, --exclude <ignore-path...>', 'Paths to ignore')
    .action(function(p_sInput) {
        if(g_aInput.length > 0) {
            p_sInput = g_aInput;
        }

        action(p_sInput)
    })
;

if(process.stdin.isTTY) {
    parseArguments();
} else {

    var readlineInterface = Readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        terminal: false
    });

    readlineInterface.on('line', function(p_sLine){
        if (p_sLine !== null) {
            g_aInput.push(p_sLine);
        }
    });

    readlineInterface.on('close', function(){
        parseArguments();
    });
}

/*EOF*/
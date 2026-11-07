#!/usr/bin/env node
// Committed so npm can link the bin at install time and set its execute bit once;
// rebuilding dist/ never touches this file.
import '../dist/cli/cli.js'

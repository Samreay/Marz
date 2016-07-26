#!/usr/bin/env bash
BASEDIR=$(dirname "$0")
node --max_old_space_size=4096 $BASEDIR/autoMarz.js $@

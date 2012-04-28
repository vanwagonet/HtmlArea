#!/bin/bash

cat src/htmlarea.js \
	src/keys.js \
	src/cleaner.js \
	src/events.js \
\
	src/utils.js \
	src/utils/upload.js \
	src/utils/editmedia.js \
	src/utils/drop.js \
\
	src/tools.js \
	src/tools/link.js \
	src/tools/image.js \
	src/tools/video.js \
\
	| uglifyjs > htmlarea.min.js;

OSIZE=`find src -name '*.js' | xargs stat -f %z | awk '{s+=$1} END {print s}'`;
NSIZE=`stat -f %z htmlarea.min.js`;
echo "original: $OSIZE - minified: $NSIZE = saved: $((OSIZE - NSIZE))";


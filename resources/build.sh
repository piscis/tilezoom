#!/bin/bash

clear

MINIMIZE=false
YUI_COMPRESSOR="lib/yuicompressor-2.4.8.jar"
JS_FOLDER="../html/js"

echo "#	============================="
echo "#	= Build"
echo "#	============================="

echo ""
echo " - compass"

compass compile
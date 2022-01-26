#!/bin/bash

#引数の数チェック
if [ $# < 1 ]; then
	echo "コメントをつけてください" 1>&2
	exit 1
fi

#Git処理
git add *
git commit -m "$1"

git push

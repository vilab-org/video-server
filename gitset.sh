#!/bin/bash

#引数の数チェック
if [ $# -lt 1 ]; then #引数が1未満(less than)
	echo "コメントをつけてください" 1>&2
	exit 1
fi

comments=""
for comment; do
	comments+="$comment "

done

max=${#comments}
max=$((max-1))
comments=${comments:0:$max}


#Git処理
git add *
git commit -m "$comments"

git push

# video-server
Jitsiを使わない場合は同梱している`default.conf`ファイルのドメイン名とIPアドレス（いわゆるドキュメントルート）を変更した上で`/etc/nginx/conf.d`に移動させる
すると、default.conf内の`root /パス`にあるindex.htmlファイルを読み込むようになる

# Let's encrypt の更新
Jitsi-meet構築時は`/usr/share/jitsi-meet`のパスで証明書を発行していたが、ドキュメントルートを変更した際は
`etc/letsencrypt/renewal/ドメイン名.conf`内の`webroot_path = `と`ドメイン名 = `のパスの箇所も同様に変更する

## 証明書の情報の確認
'sudo certbot certificates'

## 証明書の更新
'sudo certbot renew'

## 証明書の自動更新
cronを仕様して自動で証明書の更新を行う
設定ファイルに以下を記述\n
'0 10 10,20 * * sudo certbot renew'\n
0分10時10日,20日 指定なし 指定なし のタイミングで更新をかける\n

参考
[Let’s EncryptのSSL証明書を更新する(手動とcronによる自動更新)](https://it-jog.com/khow/serv/renewletsencrypt)
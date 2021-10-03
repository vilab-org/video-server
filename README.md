# video-server
Jitsiを使わない場合は同梱している`default.conf`ファイルのドメイン名とIPアドレス（いわゆるドキュメントルート）を変更した上で`/etc/nginx/conf.d`に移動させる
すると、default.conf内の`root /パス`にあるindex.htmlファイルを読み込むようになる

# Let's encrypt の更新
Jitsi-meet構築時は`/usr/share/jitsi-meet`のパスで証明書を発行していたが、ドキュメントルートを変更した際は
`etc/letsencrypt/renewal/ドメイン名.conf`内の`webroot_path = `と`ドメイン名 = `のパスの箇所も同様に変更する
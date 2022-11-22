

const hands = new Hands({
  locateFile: (file) => {
    return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
  }
});
//https://google.github.io/mediapipe/solutions/hands#configuration-options より
hands.setOptions({
  staticImageMode: false,
  /*falseに設定すると、入力画像をビデオストリームとして扱います。
  最初の入力画像で手の検出を試み、検出が成功したらさらに手のランドマークをローカライズします。
  それ以降の画像では、max_num_hands の手がすべて検出され、対応する手のランドマークが特定されると、
  どの手も見失うまで、別の検出を行わずにそれらのランドマークを単純に追跡します。
  これは待ち時間を減らすことができ、ビデオフレームを処理するのに最適な方法です。
  true に設定すると、すべての入力画像に対して手の検出が行われ、
  静的でおそらく無関係な画像のバッチ処理に最適です。デフォルトは false。*/

  maxNumHands: 2,
  /*検出するハンドの最大数。デフォルトは2。*/

  modelComplexity: 0,//負荷軽減のために0
  //https://github.com/google/mediapipe/issues/2181#:~:text=model.setOptions(%7B%0A%20%20%20%20%20%20modelComplexity%3A%201%0A%20%20%20%20%7D)%3B
  /*ハンドランドマークモデルの複雑さ。0または1。ランドマーク精度と推論レイテンシは、一般的にモデルの複雑さによって上昇する。デフォルトは1です。 */

  minDetectionConfidence: 0.6,
  /*検出が成功したとみなされるための、手検出モデルからの最小信頼値（[0.0, 1.0]）。デフォルトは0.5。*/

  minTrackingConfidence: 0.6/*手のランドマークが正常に追跡されたとみなされるための，ランドマーク追跡モデルによる最小信頼度（[0.0, 1.0]），
  さもなければ次の入力画像で自動的に手の検出が行われます．この値を大きくすると，解の頑健性が増しますが，
  その分遅延が大きくなります．static_image_mode が true の場合は無視され，単にすべての画像に対して手指の検出が行われます．
  デフォルトは0.5。*/
});
console.log('hands options', hands.g.j);

function onResults(results) {
  localVideo.setResults(results);

  let dummysLength = dummys.length;
  for (let i = 0; i < dummysLength; i++) {
    dummys[i].results = results;
    dummys[i].minMaxes = localVideo.minMaxes;
  }
}
hands.onResults(onResults);

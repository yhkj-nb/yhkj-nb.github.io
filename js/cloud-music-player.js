/**
 * 云痕音乐播放器注入脚本（yhkj-nb.github.io 专用）
 * --------------------------------------------------------------
 * 讯飞云痕音乐播放器（xf-music-player）只在页面 DOMContentLoaded
 * 时扫描「当时已经存在于 DOM 里的」<xf-music-player> 元素进行初始化，
 * 因此这里必须在「解析期同步」把元素塞进 DOM。
 *
 * 播放器脚本本体（music-player.min.js）已本地托管并以 <script> 标签
 * 在解析期引入，本文件只负责把元素同步放进 <body>。
 * is-auto-popup="true" 让播放器默认展开（否则只露出左侧折叠手柄）。
 */
(function () {
  'use strict';

  var API_URL =
    'https://music.api.xfyun.club/api/v1/music/top?platform=netease&topId=3778678';

  function ensurePlayer() {
    if (document.querySelector('xf-music-player')) return; // 防重复
    var p = document.createElement('xf-music-player');
    p.setAttribute('theme', 'xf-sky-theme');
    p.setAttribute('custom-theme-name', '云痕音乐');
    p.setAttribute('mode', 'cloud');
    p.setAttribute('api-url', API_URL);
    p.setAttribute('is-auto-popup', 'true'); // 默认展开
    (document.body || document.documentElement).appendChild(p);
  }

  // 解析期同步执行：body 已存在，元素会在 DOMContentLoaded 前进入 DOM。
  ensurePlayer();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ensurePlayer, { once: true });
  }
})();

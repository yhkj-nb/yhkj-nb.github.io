/**
 * 云痕控制台过滤
 * --------------------------------------------------------------
 * 讯飞云痕音乐播放器库（music-player.min.js）在加载时会通过
 * `console.log` 打印一行「署名」日志，例如：
 *     %c☕ 自豪采用%c小枫音乐播放器 v1.0.4
 * 这并非网页 DOM 元素，而是控制台输出，因此 DOM 级的
 * ad-blocker.js 拦不到它。本脚本在播放器脚本之前接管
 * console.log / info / warn，仅屏蔽上述「署名 / 推广」日志，
 * 保留其余所有日志（包括真实的 console.error 报错）。
 *
 * 必须在 /music-player.min.js 之前加载，才能在它打印前生效。
 */
(function () {
  'use strict';

  // 命中即视为「播放器署名 / 推广」，予以屏蔽
  var CREDIT_PATTERN =
    /自豪采用|小枫音乐播放器|云痕音乐播放器|music[- ]?player v\d/i;

  ['log', 'info', 'warn'].forEach(function (method) {
    var original = console[method];
    if (typeof original !== 'function') return;
    var bound = original.bind(console);

    console[method] = function () {
      try {
        var args = Array.prototype.slice.call(arguments);
        var text = args
          .map(function (a) {
            if (typeof a === 'string') return a;
            if (a && typeof a === 'object' && 'message' in a) {
              return String(a.message);
            }
            try {
              return String(a);
            } catch (e) {
              return '';
            }
          })
          .join(' ');

        if (CREDIT_PATTERN.test(text)) return; // 吞掉署名日志
      } catch (e) {
        /* 解析异常则放行，避免影响其他日志 */
      }
      return bound.apply(console, arguments);
    };
  });
})();

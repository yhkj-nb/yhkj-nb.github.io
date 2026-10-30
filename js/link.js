/**
 * link.js —— 云痕科技外链拦截跳转
 * ---------------------------------------------
 * 配置单独存放在 ./js/link.json：
 *   {
 *     "siteName" : "云痕科技",
 *     "logo"     : "./images/logo.png",
 *     "whitelist": [ { "host": "yhkj.ddns-ip.net", "name": "云痕主站" } ],
 *     "blacklist": [ { "host": "bad-example.com", "name": "测试黑名单站点" } ]
 *   }
 * 修改名单只需改 link.json，无需动本文件。
 * （若 JSON 拉取失败，则回退到本文件内嵌的 DEFAULTS）
 *
 * 拦截范围：凡是跳转到“非本站域名”的入口都会被拦截，包括
 *   - <a> 链接点击
 *   - window.open(...) 脚本跳转
 *   - location.assign(...) / location.replace(...) 脚本跳转
 *   - <form> 提交到外部地址
 * 只要目标域名不是本站，统一走下面的三种处理。
 *
 * 三种处理方式（按命中优先级）：
 *  1) 白名单（我的官方网站）：不直接放行，弹窗询问是否跳转
 *  2) 其他链接（非白非黑）  ：提示“你将离开云痕科技”，询问是否继续
 *  3) 黑名单（禁止访问）    ：禁止跳转，只能返回
 */
(function () {
    'use strict';

    /* ================== 内嵌兜底（JSON 拉取失败时使用） ================== */
    var DEFAULTS = {
        siteName: '云痕科技',
        logo: './images/logo.png',
        whitelist: [
            { host: 'yhkj.ddns-ip.net', name: '云痕主站' },
            { host: 'yh.yhkj.ddns-ip.net', name: '云痕导航' },
            { host: 'api.yhkj.ddns-ip.net', name: '云痕接口' }
        ],
        blacklist: [
            { host: 'bad-example.com', name: '测试黑名单站点' }
        ]
    };

    /* 运行时配置（先填兜底值，拉到 JSON 后覆盖） */
    var CONFIG = {
        siteName: DEFAULTS.siteName,
        logo: DEFAULTS.logo,
        whitelist: DEFAULTS.whitelist.slice(),
        blacklist: DEFAULTS.blacklist.slice()
    };

    /* 异步拉取 JSON 配置 */
    (function loadConfig() {
        if (!window.fetch) return;
        fetch('./js/link.json', { cache: 'no-cache' })
            .then(function (r) { return r.ok ? r.json() : Promise.reject(); })
            .then(function (cfg) {
                if (cfg.siteName) CONFIG.siteName = cfg.siteName;
                if (cfg.logo) CONFIG.logo = cfg.logo;
                if (Array.isArray(cfg.whitelist)) CONFIG.whitelist = cfg.whitelist;
                if (Array.isArray(cfg.blacklist)) CONFIG.blacklist = cfg.blacklist;
            })
            .catch(function () { /* 用兜底值即可 */ });
    })();

    /* 在名单中匹配域名（支持子域），返回匹配到的条目对象（含 name），否则 null */
    function matchEntry(host, list) {
        for (var i = 0; i < list.length; i++) {
            var d = list[i];
            var base = typeof d === 'string' ? d : d.host;
            if (!base) continue;
            if (host === base || host.slice(-base.length - 1) === '.' + base) return d;
        }
        return null;
    }

    /* 统一判定：返回 { type, entry } */
    function classify(url) {
        if (url.hostname === location.hostname) return { type: 'allow' };
        var blk = matchEntry(url.hostname, CONFIG.blacklist);
        if (blk) return { type: 'block', entry: blk };
        var wlt = matchEntry(url.hostname, CONFIG.whitelist);
        if (wlt) return { type: 'trusted', entry: wlt };
        return { type: 'warn' };
    }

    /* ---------- 样式 ---------- */
    var css = ''
        + '.yk-mask{position:fixed;inset:0;z-index:2147483000;background:rgba(0,0,0,.6);backdrop-filter:blur(4px);'
        + 'display:flex;align-items:center;justify-content:center;font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif;}'
        + '.yk-card{width:88%;max-width:380px;background:#fff;border-radius:16px;padding:30px 26px 24px;text-align:center;'
        + 'box-shadow:0 20px 60px rgba(0,0,0,.35);animation:yk-pop .25s ease;}'
        + '@keyframes yk-pop{from{transform:scale(.9);opacity:0}to{transform:scale(1);opacity:1}}'
        + '.yk-logo{width:56px;height:56px;border-radius:50%;object-fit:cover;margin-bottom:12px;}'
        + '.yk-title{font-size:20px;font-weight:700;color:#111;margin-bottom:10px;}'
        + '.yk-title.danger{color:#d93025;}'
        + '.yk-text{font-size:14px;color:#666;line-height:1.8;word-break:break-all;}'
        + '.yk-host{display:inline-block;margin:8px 0 2px;padding:3px 10px;border-radius:6px;'
        + 'background:#f2f3f5;color:#333;font-size:13px;font-weight:600;}'
        + '.yk-btns{margin-top:22px;display:flex;gap:12px;}'
        + '.yk-btn{flex:1;padding:11px 0;border:none;border-radius:10px;font-size:15px;font-weight:600;cursor:pointer;}'
        + '.yk-btn.go{background:#1a73e8;color:#fff;}'
        + '.yk-btn.back{background:#f2f3f5;color:#333;}';
    var style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);

    /* 原始 open 引用，所有“真正放行”的导航都走它，避免递归触发包装 */
    var _open = window.open;

    /* ---------- 弹层构建 ---------- */
    function buildCard(opts) {
        var mask = document.createElement('div');
        mask.className = 'yk-mask';
        mask.innerHTML = '<div class="yk-card">'
            + '<img class="yk-logo" src="' + CONFIG.logo + '" alt="logo">'
            + '<div class="yk-title' + (opts.danger ? ' danger' : '') + '">' + opts.title + '</div>'
            + '<div class="yk-text">' + opts.text + '</div>'
            + '<div class="yk-btns">' + opts.buttons + '</div></div>';
        document.body.appendChild(mask);
        if (opts.dismissable) {
            mask.addEventListener('click', function (e) {
                if (e.target === mask) mask.remove();
            });
        }
        return mask;
    }

    /* 默认“真正跳转”方式：新标签打开 */
    function nav(u) { _open.call(window, u.href, '_blank', 'noopener'); }

    /* 询问是否跳转（白名单 / 其他外链共用），onGo 为确认后真正执行导航的回调 */
    function showConfirm(url, opts, onGo) {
        var go = (typeof onGo === 'function') ? onGo : nav;
        var mask = buildCard({
            danger: false,
            title: opts.title,
            text: opts.text,
            buttons: '<button class="yk-btn back">返 回</button><button class="yk-btn go">继续访问</button>',
            dismissable: true
        });
        mask.querySelector('.yk-btn.back').addEventListener('click', function () { mask.remove(); });
        mask.querySelector('.yk-btn.go').addEventListener('click', function () { mask.remove(); go(); });
    }

    /* 模式 1：白名单（我的官方网站）—— 弹窗询问是否跳转 */
    function showTrusted(url, entry, onGo) {
        var name = (entry && entry.name) ? entry.name : url.hostname;
        showConfirm(url, {
            title: '前往官方网站',
            text: '您即将前往 ' + CONFIG.siteName + ' 的官方网站<br>'
                + '<span class="yk-host">' + name + '（' + url.hostname + '）</span><br>'
                + '是否继续跳转？'
        }, onGo);
    }

    /* 模式 2：其他外链（非白非黑）—— 你将离开 */
    function showWarn(url, onGo) {
        showConfirm(url, {
            title: '你将离开 ' + CONFIG.siteName,
            text: '该链接未经 ' + CONFIG.siteName + ' 安全验证<br>'
                + '即将前往：<span class="yk-host">' + url.hostname + '</span><br>'
                + '请注意你的账号与财产安全'
        }, onGo);
    }

    /* 模式 3：黑名单 —— 拒绝访问，只能返回 */
    function showBlock(url, entry) {
        var name = (entry && entry.name) ? entry.name : url.hostname;
        var mask = buildCard({
            danger: true,
            title: '拒绝访问',
            text: '<span class="yk-host">' + name + '（' + url.hostname + '）</span><br>'
                + '已被 ' + CONFIG.siteName + ' 列入黑名单<br>已禁止跳转，您只能返回',
            buttons: '<button class="yk-btn back">返 回</button>',
            dismissable: false
        });
        mask.querySelector('.yk-btn.back').addEventListener('click', function () { mask.remove(); });
    }

    /* 统一处理：拦截后按类型弹窗；onGo 为“确认后真正导航”的回调（默认新标签打开） */
    function handle(url, onGo) {
        var c = classify(url);
        if (c.type === 'allow') return true;
        if (c.type === 'block') { showBlock(url, c.entry); return false; }
        if (c.type === 'trusted') { showTrusted(url, c.entry, onGo); return false; }
        showWarn(url, onGo); return false;
    }

    /* 安全解析 URL */
    function parseUrl(href) {
        try { return new URL(href, location.href); } catch (e) { return null; }
    }

    /* ---------- 入口 1：<a> 链接点击 ---------- */
    document.addEventListener('click', function (e) {
        var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
        if (!a) return;
        var href = a.getAttribute('href');
        if (!href || href.charAt(0) === '#' || /^(javascript|mailto|tel):/i.test(href)) return;
        var url = parseUrl(href);
        if (!url) return;
        if (classify(url).type === 'allow') return;   /* 站内链接直接放行 */
        e.preventDefault();
        e.stopPropagation();
        handle(url);
    }, true);

    /* ---------- 入口 2：window.open(...) 脚本跳转 ---------- */
    if (typeof _open === 'function') {
        try {
            window.open = function (url, name, specs, replace) {
                if (typeof url !== 'string') return _open.apply(window, arguments);
                var u = parseUrl(url);
                if (!u) return _open.apply(window, arguments);
                if (classify(u).type === 'allow') return _open.apply(window, arguments);
                var args = arguments;
                handle(u, function () { _open.apply(window, args); });
                return null;
            };
        } catch (e) { /* 浏览器不允许覆盖则忽略，仍保留点击拦截 */ }
    }

    /* ---------- 入口 3：location.assign / location.replace 脚本跳转 ---------- */
    ['assign', 'replace'].forEach(function (m) {
        if (typeof window.location[m] !== 'function') return;
        var orig = window.location[m].bind(window.location);
        try {
            window.location[m] = function (url) {
                var u = parseUrl(url);
                if (!u) return orig.apply(null, arguments);
                if (classify(u).type === 'allow') return orig.apply(null, arguments);
                var args = arguments;
                handle(u, function () { orig.apply(null, args); });
            };
        } catch (e) { /* 忽略 */ }
    });

    /* ---------- 入口 4：<form> 提交到外部地址 ---------- */
    document.addEventListener('submit', function (e) {
        var t = e.target;
        if (!t || !t.tagName || t.tagName.toLowerCase() !== 'form') return;
        var action = t.getAttribute('action');
        if (!action) return;
        var u = parseUrl(action);
        if (!u) return;
        if (classify(u).type === 'allow') return;
        e.preventDefault();
        e.stopPropagation();
        handle(u);
    }, true);
})();

/**
 * link.js —— 云痕科技外链拦截跳转
 * ---------------------------------------------
 * 配置单独存放在 ./js/link.json：
 *   {
 *     "siteName" : "云痕科技",
 *     "logo"     : "./images/logo.png",
 *     "trusted"  : ["白名单域名，直接跳转"],
 *     "blacklist": ["黑名单域名，禁止访问"]
 *   }
 * 修改名单只需改 link.json，无需动本文件。
 * （若 JSON 拉取失败，则回退到本文件内嵌的 DEFAULTS）
 */
(function () {
    'use strict';

    /* ================== 内嵌兜底（JSON 拉取失败时使用） ================== */
    var DEFAULTS = {
        siteName: '云痕科技',
        logo: './images/logo.png',
        trusted: [
            'yhkj.ddns-ip.net',
            'yh.yhkj.ddns-ip.net',
            'api.yhkj.ddns-ip.net'
        ],
        blacklist: []
    };

    /* 运行时配置（先填兜底值，拉到 JSON 后覆盖） */
    var CONFIG = {
        siteName: DEFAULTS.siteName,
        logo: DEFAULTS.logo,
        trusted: DEFAULTS.trusted.slice(),
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
                if (Array.isArray(cfg.trusted)) CONFIG.trusted = cfg.trusted;
                if (Array.isArray(cfg.blacklist)) CONFIG.blacklist = cfg.blacklist;
            })
            .catch(function () { /* 用兜底值即可 */ });
    })();

    function inList(host, list) {
        return list.some(function (d) { return host === d || host.slice(-d.length - 1) === '.' + d; });
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
        mask.addEventListener('click', function (e) {
            if (e.target === mask && opts.dismissable) mask.remove();
        });
        return mask;
    }

    /* 情形 1：黑名单 → 拒绝访问，只能返回 */
    function showBlock(url) {
        var mask = buildCard({
            danger: true,
            title: '拒绝访问',
            text: '该网站在 ' + CONFIG.siteName + ' 黑名单中，已禁止访问<br>'
                + '<span class="yk-host">' + url.hostname + '</span>',
            buttons: '<button class="yk-btn back">返 回</button>',
            dismissable: false
        });
        mask.querySelector('.yk-btn.back').addEventListener('click', function () { mask.remove(); });
    }

    /* 情形 2：普通外链 → 你将离开确认页 */
    function showWarn(url) {
        var mask = buildCard({
            title: '你将离开 ' + CONFIG.siteName,
            text: '该链接未经 ' + CONFIG.siteName + ' 安全验证<br>'
                + '即将前往：<span class="yk-host">' + url.hostname + '</span><br>'
                + '请注意你的账号与财产安全',
            buttons: '<button class="yk-btn back">返 回</button><button class="yk-btn go">继续访问</button>',
            dismissable: true
        });
        mask.querySelector('.yk-btn.back').addEventListener('click', function () { mask.remove(); });
        mask.querySelector('.yk-btn.go').addEventListener('click', function () {
            window.open(url.href, '_blank', 'noopener');
            mask.remove();
        });
    }

    /* ---------- 拦截点击（捕获阶段，确保先于页面自身逻辑） ---------- */
    document.addEventListener('click', function (e) {
        var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
        if (!a) return;
        var href = a.getAttribute('href');
        if (!href || href.charAt(0) === '#' || /^(javascript|mailto|tel):/i.test(href)) return;
        var url;
        try { url = new URL(href, location.href); } catch (err) { return; }
        if (url.hostname === location.hostname) return;      /* 站内链接直接放行 */
        if (inList(url.hostname, CONFIG.trusted)) return;    /* 白名单直接放行 */
        e.preventDefault();
        e.stopPropagation();
        if (inList(url.hostname, CONFIG.blacklist)) showBlock(url);
        else showWarn(url);
    }, true);
})();

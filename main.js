window.addEventListener('DOMContentLoaded', () => {
    // --- 1. 初期設定 & グローバル変数 ---
    const SUPABASE_URL = 'https://mnvdpvsivqqbzbtjtpws.supabase.co';
    const SUPABASE_ANON_KEY =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1udmRwdnNpdnFxYnpidGp0cHdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMyNTM0MTIsImV4cCI6MjA2ODgyOTQxMn0.v5tAGcd0K4VW9yR1CZYVjMYHLhWJXN7Tz5j9DNf1CQE';

    const METRICS_FALLBACK = '?';

    const { createClient } = window.supabase;
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    let selectedFiles = [];

    let currentUser = null;
    let realtimeChannel = null;
    let currentTimelineTab = 'foryou';
    let replyingTo = null;
    let quotingPost = null;
    let newIconDataUrl = null;
    let resetIconToDefault = false;
    let currentDmChannel = null;
    let lastRenderedMessageId = null;
    let allUsersCache = new Map(); // オブジェクトからMapに変更
    let TrustCache = [];

    const contributors = fetch('contributors.json').then((res) => res.json());

    const custom_emoji = fetch('emoji/list.json').then((res) => res.json());

    let isLoadingMore = false;
    let postLoadObserver;
    let currentPagination = { page: 0, hasMore: true, type: null, options: {} };
    let POST_COUNT = 0;
    const POSTS_PER_PAGE = 30;
    const AdPOST_PER_POSTS = 30;

    let isDarkmode = window.matchMedia('(prefers-color-scheme: dark)').matches;
    let emoji_picker_theme = 'light';

    // --- 2. アイコンSVG定義 ---
    const ICONS = {
        home: `<svg viewBox="0 0 24 24"><path d="M21 9V20C21 20.5304 20.7891 21.039 20.4141 21.4141C20.039 21.7891 19.5304 22 19 22H15V12H9V22H5C4.46957 22 3.96101 21.7891 3.58594 21.4141C3.21086 21.039 3 20.5304 3 20V9L12 2L21 9Z"></path></svg>`,
        dm: `<svg viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>`,
        send: `<svg viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>`,
        explore: `<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>`,
        notifications: `<svg viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>`,
        likes: `<svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>`,
        stars: `<svg viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>`,
        profile: `<svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`,
        settings: `<svg viewBox="0 0 24 24"><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0-.33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0 .33 1.82V12a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path><circle cx="12" cy="12" r="3"></circle></svg>`,
        attachment: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>`,
        back: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>`,
        reply: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>`,
        copy: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`,
        repost: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 2l4 4-4 4"></path><path d="M3 11v-1a4 4 0 0 1 4-4h14"></path><path d="M7 22l-4-4 4-4"></path><path d="M21 13v1a4 4 0 0 1-4 4H3"></path></svg>`,
        pin: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V17z"></path><line x1="12" y1="17" x2="12" y2="22"></line></svg>`,
        trust: `<svg id="trl" role="img" viewBox="0 0 220 40"><rect x=".5" y="4" width="125" height="32" rx="16" ry="16" fill="rgba(0,0,0,0.18)"/><circle cx="20" cy="20" r="10" fill="TRL_Color"/><text x="40" y="22" dominant-baseline="middle" fill="#FFFFFF" font-family="Inter, Arial, Helvetica, sans-serif" font-size="15" font-weight="600">TRL_Text</text></svg>`,
        emoji: `<svg viewBox="0,0,17.13786,14.47712" fill="currentColor" stroke="none" stroke-width="0.5" stroke-miterlimit="10"><g transform="translate(-231.43107,-172.76144)"><path d="M239.94712,186.81929c-0.0507,0.41926 -0.49531,0.41927 -0.49531,0.41927c-3.96787,0 -8.01249,-0.68535 -8.02074,-5.61285c0.17537,-2.64023 1.74956,-4.43331 2.70713,-6.82761c0.16543,-0.41362 0.45628,-1.91295 0.94891,-2.02221c1.10065,-0.2441 2.66273,2.67451 2.86873,3.4552c0.31374,0.81649 3.15293,0.99792 3.94628,0.24025c0.52177,-0.4983 0.89896,-3.42207 1.84402,-3.42151c1.12146,0.00067 2.30001,2.5981 2.70772,3.35984c0.28978,1.21395 1.21609,1.24536 1.72418,2.54303c1.5838,4.04503 -1.95067,5.61523 -5.12606,6.89251c-1.04106,0.43359 -1.98213,0.90597 -3.10486,0.97409zM239.12209,186.23762c0.05606,-0.41004 0.49412,-0.41004 0.49412,-0.41004h0.0822c1.08582,0.00791 1.99423,-0.49911 2.97557,-0.90816c0.90613,-0.36021 4.40914,-1.62575 4.69789,-2.51803c0.91767,-2.83576 -1.39409,-3.5574 -1.85281,-5.63655c-0.29134,-0.52115 -1.70912,-2.14942 -1.64872,-2.72273c0.04683,-0.4445 -0.19827,0.87957 -0.39231,1.28221c-0.2529,0.52475 -0.45183,1.48329 -0.88714,1.87204c-1.38878,1.24023 -4.99067,0.88942 -5.58856,-0.66392c-0.06813,-0.293 -1.17064,-1.8955 -1.53788,-2.53236c-0.07769,0.34794 -0.29151,0.90382 -0.39826,1.17066c-0.29222,0.73044 -0.44273,1.50704 -0.74532,2.23256c-0.71976,1.7258 -1.74751,2.12166 -1.89035,4.25572c-0.00851,4.18415 3.41992,4.55867 6.69156,4.57862z"/><path d="M238.45934,181.66821c-0.35355,0.35356 -0.70711,0 -0.70711,0l-0.18648,-0.23974c-0.16632,-0.39918 -0.61694,-1.00924 -0.81966,-1.49844c-0.30124,0.60062 -0.60549,1.16756 -1.03983,1.70125c0,0 -0.31662,0.38698 -0.7036,0.07036c-0.38698,-0.31662 -0.07036,-0.7036 -0.07036,-0.7036c0.45322,-0.55057 0.73715,-1.14917 1.05641,-1.78332l0.14449,-0.46957c0.05931,-0.20994 0.25229,-0.36377 0.48121,-0.36377c0.18932,0 0.35406,0.10521 0.43894,0.26035l0.30916,0.54103l-0.01905,0.01088c0.47079,0.53548 0.82099,1.07173 1.14536,1.85022l-0.02949,-0.08275c0,0 0.35355,0.35356 0,0.70711z"/><path d="M244.58258,181.789c-0.47434,0.15812 -0.63245,-0.31623 -0.63245,-0.31623l-0.08204,-0.24655c-0.7487,-2.49444 -1.20387,-2.36025 -1.86474,0.13877c0,0 -0.12883,0.48311 -0.61194,0.35429c-0.48311,-0.12883 -0.35429,-0.61195 -0.35429,-0.61195c0.13898,-0.51735 0.96019,-3.11558 1.79527,-3.07868c0.83267,0.0368 1.77893,2.22608 1.99149,2.90349l0.07495,0.2244c0,0 0.15811,0.47434 -0.31623,0.63245z"/></g></svg>`,
        nyax_logo: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0,0,86.03313,99.70458"><g transform="translate(-196.60558,-130.32065)"><g fill="currentColor" stroke="none"><path d="M196.60559,230.02523l0,-70.13795l17.47488,-0.00265l0.02074,39.64497l14.92353,-19.35604l-14.9511,-20.28628l-17.46804,0v-29.56663h18.56125l24.87297,33.70192l24.96791,-33.70192h17.63101l0,29.64857l-17.18324,0l-15.17417,19.90152l15.22948,20.56652l-0.05143,-40.54738l17.17935,0.07934l0,70.05601h-17.47906l-25.25271,-34.55634l-24.3983,34.55634z"/></g></g></svg>`,
        mask: `<svg viewBox="0 0 10 10" fill="none" stroke="#000000" stroke-width="0.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="5" cy="5" r="4"/><line x1="5" y1="2.5" x2="5" y2="6"/><line x1="5" y1="7.6" x2="5" y2="7.6"/></svg>`,
    };

    // --- 3. DOM要素の取得 ---
    const DOM = {
        mainContent: document.getElementById('main-content'),
        navMenuTop: document.getElementById('nav-menu-top'),
        navMenuBottom: document.getElementById('nav-menu-bottom'),
        navLogo: document.getElementById('nav-logo'),
        pageHeader: document.getElementById('page-header'),
        screens: document.querySelectorAll('.screen'),
        postFormContainer: document.querySelector('.post-form-container'),
        postModal: document.getElementById('post-modal'),
        editPostModal: document.getElementById('edit-post-modal'),
        editPostModalContent: document.getElementById(
            'edit-post-modal-content',
        ),
        createDmModal: document.getElementById('create-dm-modal'),
        createDmModalContent: document.getElementById(
            'create-dm-modal-content',
        ),
        dmManageModal: document.getElementById('dm-manage-modal'),
        dmManageModalContent: document.getElementById(
            'dm-manage-modal-content',
        ),
        editDmMessageModal: document.getElementById('edit-dm-message-modal'),
        editDmMessageModalContent: document.getElementById(
            'edit-dm-message-modal-content',
        ),
        connectionErrorOverlay: document.getElementById(
            'connection-error-overlay',
        ),
        retryConnectionBtn: document.getElementById('retry-connection-btn'),
        freezeOverlay: document.getElementById('freeze-overlay'),
        freezeReason: document.getElementById('freeze-reason'),
        imagePreviewModal: document.getElementById('image-preview-modal'),
        imagePreviewModalContent: document.getElementById(
            'image-preview-modal-content',
        ),
        timeline: document.getElementById('timeline'),
        exploreContent: document.getElementById('explore-content'),
        notificationsContent: document.getElementById('notifications-content'),
        likesContent: document.getElementById('likes-content'),
        starsContent: document.getElementById('stars-content'),
        postDetailContent: document.getElementById('post-detail-content'),
        searchResultsScreen: document.getElementById('search-results-screen'),
        searchResultsContent: document.getElementById('search-results-content'),
        dmScreen: document.getElementById('dm-screen'),
        dmContent: document.getElementById('dm-content'),
        loadingOverlay: document.getElementById('loading-overlay'),
        loginBanner: document.getElementById('login-banner'),
        rightSidebar: {
            recommendations: document.getElementById(
                'recommendations-widget-container',
            ),
            searchWidget: document.getElementById(
                'right-sidebar-search-widget-container',
            ),
            links: document.getElementById('right-sidebar-links-container'),
        },
    };

    // --- 4. ユーティリティ関数 ---
    function showLoading(show) {
        DOM.loadingOverlay.classList.toggle('hidden', !show);
    }

    function showScreen(screenId) {
        DOM.screens.forEach((screen) => {
            if (!screen.classList.contains('hidden')) {
                screen.classList.add('hidden');
            }
        });
        const targetScreen = document.getElementById(screenId);
        if (targetScreen) {
            targetScreen.classList.remove('hidden');
        }
    }

    function escapeHTML(str) {
        if (typeof str !== 'string') return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML.replaceAll(`'`, '&#39;').replaceAll(`"`, '&#34;');
    }

    function getEmoji(str) {
        switch (currentUser?.settings?.emoji || 'emojione') {
            case 'twemoji':
                // titleにshortnameを挿入(Emoji Oneの関数使用)
                let twe_div = document.createElement('div');
                twe_div.innerHTML = twemoji.parse(str, {
                    callback: function (icon, options) {
                        return `https://jdecked.github.io/twemoji/v/latest/svg/${icon}.svg`;
                    },
                });
                twe_div.querySelectorAll('img').forEach((value) => {
                    value.title = emojione.toShort(value.alt);
                });
                return twe_div.innerHTML;
            case 'emojione':
                return emojione.toImage(str);
            default:
                return str;
        }
    }

    function getUserIconUrl(user) {
        if (!user) return 'logo.png';

        // icon_dataが存在するかチェック
        if (user.icon_data) {
            // Data URL形式か、それともファイルID(UUID)かを判別
            if (user.icon_data.startsWith('data:image')) {
                // 古い形式（Data URL）の場合はそのまま返す
                return user.icon_data;
            } else {
                // 新しい形式（ファイルID）の場合は、Supabase Storageの公開URLを生成して返す
                const { data } = supabase.storage
                    .from('nyax')
                    .getPublicUrl(user.icon_data);
                return data.publicUrl;
            }
        }

        // icon_dataがなければ、デフォルトのアバター(_neko_)URLを返す
        return `/emoji/neko.svg`;
    }

    async function renderDmMessage(msg) {
        await ensureMentionedUsersCached([msg.content]);
        if (msg.type === 'system') {
            const formattedContent = formatPostContent(
                msg.content,
                allUsersCache,
            );
            return `<div class="dm-system-message">${formattedContent}</div>`;
        }

        let attachmentsHTML = '';
        if (msg.attachments && msg.attachments.length > 0) {
            attachmentsHTML += '<div class="attachments-container">';
            for (const attachment of msg.attachments) {
                const { data: publicUrlData } = supabase.storage
                    .from('nyax')
                    .getPublicUrl(attachment.id);
                const publicURL = escapeHTML(publicUrlData.publicUrl);

                let itemHTML = '<div class="attachment-item">';
                if (attachment.type === 'image') {
                    itemHTML += `<img src="${publicURL}" alt="${escapeHTML(attachment.name)}" class="attachment-image" onclick="event.stopPropagation(); window.openImageModal('${publicURL}')">`;
                } else if (attachment.type === 'video') {
                    itemHTML += `<video src="${publicURL}" controls onclick="event.stopPropagation();"></video>`;
                } else if (attachment.type === 'audio') {
                    itemHTML += `<audio src="${publicURL}" controls onclick="event.stopPropagation();"></audio>`;
                }

                itemHTML += `<a href="#" class="attachment-download-link" onclick="event.preventDefault(); event.stopPropagation(); window.handleDownload('${publicURL}', '${escapeHTML(attachment.name)}')">${getEmoji('📄')} ${escapeHTML(attachment.name)}</a>`;
                itemHTML += '</div>';
                attachmentsHTML += itemHTML;
            }
            attachmentsHTML += '</div>';
        }

        const formattedContent = msg.content
            ? formatPostContent(msg.content, allUsersCache)
            : '';
        const sent = msg.userid === currentUser.id;

        if (sent) {
            // 送信メッセージ
            return `<div class="dm-message-container sent" data-message-id="${escapeHTML(msg.id)}">
                <div class="dm-message-wrapper">
                    <button class="dm-message-menu-btn">…</button>
                    <div class="post-menu">
                        <button class="edit-dm-msg-btn">編集</button>
                        <button class="delete-dm-msg-btn delete-btn">削除</button>
                    </div>
                    <div class="dm-message">${formattedContent}${attachmentsHTML}</div>
                </div>
            </div>`;
        } else {
            // 受信メッセージ
            const user = allUsersCache.get(msg.userid) || {};
            const time = new Date(msg.time).toLocaleTimeString('ja-JP', {
                hour: '2-digit',
                minute: '2-digit',
            });
            return `<div class="dm-message-container received">
                <a href="#profile/${user.id}" class="dm-user-link">
                    <img src="${getUserIconUrl(user)}" class="dm-message-icon">
                </a>
                <div class="dm-message-wrapper">
                    <div class="dm-message-meta">
                        <a href="#profile/${user.id}" class="dm-user-link">${getEmoji(escapeHTML(user.name || '不明'))}</a>
                        ・${time}
                    </div>
                    <div class="dm-message">${formattedContent}${attachmentsHTML}</div>
                </div>
            </div>`;
        }
    }

    function updateFollowButtonState(
        buttonElement,
        isFollowing,
        isLock = false,
    ) {
        buttonElement.classList.remove(
            'follow-button-not-following',
            'follow-button-following',
        );
        if (isFollowing) {
            buttonElement.classList.add('follow-button-following');
            if (isLock) {
                buttonElement.textContent = '承認待ち';
                buttonElement.onmouseleave = () => {
                    buttonElement.textContent = '承認待ち';
                };
            } else {
                buttonElement.textContent = 'フォロー中';
                buttonElement.onmouseleave = () => {
                    buttonElement.textContent = 'フォロー中';
                };
            }
            buttonElement.onmouseenter = () => {
                buttonElement.textContent = 'フォロー解除';
            };
        } else {
            if (isLock) {
                buttonElement.textContent = 'フォローリクエスト';
            } else {
                buttonElement.textContent = 'フォロー';
            }
            buttonElement.classList.add('follow-button-not-following');
            buttonElement.onmouseenter = null;
            buttonElement.onmouseleave = null;
        }
        buttonElement.disabled = false;
    }

    async function sendNotification(recipientId, message, openHash = '') {
        if (
            !currentUser ||
            !recipientId ||
            !message ||
            recipientId === currentUser.id
        )
            return;

        try {
            const { error } = await supabase.rpc(
                'send_notification_with_timestamp',
                {
                    recipient_id: recipientId,
                    message_text: message,
                    open_hash: openHash,
                },
            );

            if (error) {
                console.error('通知の送信に失敗しました:', error);
            }
        } catch (e) {
            console.error('通知送信中にエラー発生:', e);
        }
    }

    function formatPostContent(text, userCache = new Map()) {
        // 常にプレーンテキストとして処理する
        const processStandardText = (standardText) => {
            let processed = escapeHTML(standardText);
            const urls = [];

            // 1. URLをプレースホルダーに置換
            const urlRegex =
                /(https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&//=;]*))/g;
            processed = processed.replace(urlRegex, (url) => {
                const placeholder = `%%URL_${urls.length}%%`;
                urls.push(url);
                return placeholder;
            });

            // 2. 絵文字を置換
            const emojiRegex = /(?<!\w)_([a-zA-Z0-9_!?.-]+)_(?!\w)/g;
            processed = processed.replace(emojiRegex, (match, emojiId) => {
                return `<img src="/emoji/${emojiId}.svg" alt="_${emojiId}_" style="height: 1.2em; vertical-align: -0.2em; margin: 0 0.05em;" class="nyax-emoji">`;
            });

            // 3. 絵文字を変換
            processed = getEmoji(processed);

            // 4. ハッシュタグとメンションを置換
            const hashtagRegex = /#([^<>/@#\s]+)/g;
            processed = processed.replace(hashtagRegex, (match, tagName) => {
                return `<a href="#search/${encodeURIComponent(tagName)}" onclick="event.stopPropagation()">#${getEmoji(tagName)}</a>`;
            });
            const mentionRegex = /@(\d+)/g;
            processed = processed.replace(mentionRegex, (match, userId) => {
                const numericId = parseInt(userId);
                if (userCache.has(numericId)) {
                    const user = userCache.get(numericId);
                    const userName = user ? user.name : `user${numericId}`;
                    return `<a href="#profile/${numericId}" onclick="event.stopPropagation()">@${getEmoji(escapeHTML(userName))}</a>`;
                }
                return match;
            });

            // 5. URLを<a>タグに戻す
            urls.forEach((url, i) => {
                const placeholder = `%%URL_${i}%%`;
                const link = `<a href="${url}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()">${escapeHTML(url)}</a>`;
                processed = processed.replace(placeholder, link);
            });

            return processed.replace(/\n/g, '<br>');
        };

        // Markdown判定を削除し、常にprocessStandardTextを呼び出す
        return processStandardText(text);
    }
    function filterBlockedPosts(posts) {
        if (!currentUser || !Array.isArray(posts)) return posts;
        return posts.filter((post) => {
            const authorId = post.userid || post.user?.id;
            if (!authorId) return true;

            // 自分がこの投稿主をブロックしている場合は常に除外
            if (
                Array.isArray(currentUser.block) &&
                currentUser.block.includes(authorId)
            )
                return false;

            const author = allUsersCache.get(authorId);
            // 投稿主が自分をブロックしている場合
            if (
                author &&
                Array.isArray(author.block) &&
                author.block.includes(currentUser.id)
            ) {
                // 自分がadminのときだけ規制を通過
                if (currentUser.admin) {
                    return true;
                } else {
                    return false;
                }
            }
            return true;
        });
    }

    async function ensureMentionedUsersCached(texts) {
        const allMentionedIds = new Set();
        for (const text of texts) {
            if (!text) continue;
            for (const match of text.matchAll(/@(\d+)/g)) {
                allMentionedIds.add(parseInt(match[1]));
            }
        }
        const newIdsToFetch = [...allMentionedIds].filter(
            (id) => id && !allUsersCache.has(id),
        );
        if (newIdsToFetch.length > 0) {
            const { data: users } = await supabase
                .from('user')
                .select('id, name, scid, icon_data, block')
                .in('id', newIdsToFetch);
            if (users) users.forEach((u) => allUsersCache.set(u.id, u));
        }
    }

    async function getUserTrustRank(id, single = true) {
        let ids = [];
        if (single) {
            const cache = TrustCache.find((u) => u.id === id);
            if (cache) return cache;
            ids = [id];
        } else {
            const cachedIds = TrustCache.map((u) => u.id);
            ids = id.filter((i) => !cachedIds.includes(i));
        }
        if (ids.length > 0) {
            const { data: trustData, error } = await supabase.rpc(
                'get_trust_ranks',
                { user_ids: ids },
            );
            if (error || !trustData) return null;
            for (trl of trustData) {
                if (!TrustCache.find((u) => u.id === trl.id))
                    TrustCache.push(trl);
            }
        }
        if (single) return TrustCache.find((u) => u.id === id);
        return TrustCache.filter((u) => id.includes(u.id));
    }

    async function MakeTrustLabel(id, single = true) {
        if (!currentUser?.settings?.show_trust_label) return '';
        let ids = [];
        if (single) {
            ids = [id];
        } else {
            ids = id;
        }
        const trustData = await getUserTrustRank(ids, false);
        if (!trustData || trustData == null) return ICONS.trust;
        let labels = [];

        for (trl of trustData) {
            let labelsvg = ICONS.trust;
            labelsvg = labelsvg.replace('TRL_Text', trl.rankid);
            labelsvg = labelsvg.replace('TRL_Color', trl.color);
            labels.push(labelsvg);
        }
        if (single) return labels[0];
        return labels;
    }

    function isNotBlank(str) {
        if (str.match(/\S/)) return true;
        else return false;
    }

    async function emoji_picker_create(container) {
        // ここからEmoji Mart
        let _custom_emoji = await custom_emoji;
        let custom = [];
        let value_e;
        for (let i = 0; i < _custom_emoji.length; i++) {
            value_e = _custom_emoji[i];
            custom.push({
                id: value_e.id,
                name: value_e.name,
                keywords: [value_e.id, value_e.name, 'NyaXEmoji'],
                skins: [
                    {
                        src: `emoji/${value_e.id}.svg`,
                    },
                ],
            });
        }

        const picker = container.querySelector('#emoji-picker');
        const pic_button = container.querySelector('.emoji-pic-button');
        const pickerOptions = {
            onEmojiSelect: (emoji) => {
                let textarea = container.querySelector('textarea');
                const text_start = textarea.selectionStart;
                const text_end = textarea.selectionEnd;
                const text = textarea.value;

                let moji;
                if (emoji.keywords.includes('NyaXEmoji'))
                    moji = `${isNotBlank(text.slice(text_start - 1, text_start)) ? ' ' : ''}_${emoji.id}_${isNotBlank(text.slice(text_end, text_end + 1)) || text.slice(text_end, text_end + 1) == '' ? ' ' : ''}`;
                else moji = emoji.native;

                textarea.value =
                    text.slice(0, text_start) + moji + text.slice(text_end);
                textarea.focus();
                textarea.setSelectionRange(
                    text_start + moji.length,
                    text_start + moji.length,
                );

                picker.classList.add('hidden');
            },
            set: 'native',
            searchPosition: 'none',
            locale: 'ja',
            custom: [
                {
                    id: 'nyax',
                    name: 'NyaXEmoji',
                    emojis: custom,
                },
            ],
            categoryIcons: {
                nyax: {
                    svg: ICONS.nyax_logo,
                },
            },
            categories: [
                'frequent',
                'nyax',
                'people',
                'nature',
                'foods',
                'activity',
                'places',
                'objects',
                'symbols',
                'flags',
            ],
            skinTonePosition: 'none',
            skin: '1',
            theme: emoji_picker_theme,
        };
        const picker_modal = new EmojiMart.Picker(pickerOptions);
        picker.appendChild(picker_modal);

        pic_button.addEventListener('click', () => {
            picker.classList.toggle('hidden');

            if (!picker.classList.contains('hidden')) {
                const buttonRect = pic_button.getBoundingClientRect();
                const pickerWidth = 320;
                const pickerHeight = 400;
                let left = buttonRect.left;
                let top = buttonRect.top;

                if (left + pickerWidth > window.innerWidth)
                    left = window.innerWidth - pickerWidth - 8;
                if (left < 8) left = 8;
                if (top < 8) top = buttonRect.buttom + 8;

                picker.style.left = `${left}px`;
                picker.style.top = `${top + 50}px`;
            }
        });

        container
            .querySelector('textarea')
            .addEventListener('focus', () => picker.classList.add('hidden'));
        // ここまでEmoji Mart
    }

    // --- 5. ルーティングと画面管理 ---
    async function router() {
        showLoading(true);
        isLoadingMore = false;

        // Theme
        isDarkmode = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (currentUser) {
            if (currentUser.settings?.theme == 'dark') {
                document.body.classList.remove('light');
                document.body.classList.add('dark');
                emoji_picker_theme = 'dark';
            } else if (currentUser.settings?.theme == 'auto') {
                if (isDarkmode) {
                    document.body.classList.remove('light');
                    document.body.classList.add('dark');
                    emoji_picker_theme = 'dark';
                } else {
                    document.body.classList.add('light');
                    document.body.classList.remove('dark');
                    emoji_picker_theme = 'light';
                }
            } else {
                document.body.classList.add('light');
                document.body.classList.remove('dark');
                emoji_picker_theme = 'light';
            }
        } else {
            document.body.classList.add('light');
            document.body.classList.remove('dark');
            emoji_picker_theme = 'light';
        }

        if (currentDmChannel) supabase.removeChannel(currentDmChannel);

        const existingSubTabs = document.getElementById(
            'profile-sub-tabs-container',
        );
        if (existingSubTabs) {
            existingSubTabs.remove();
        }

        await updateNavAndSidebars();
        const hash = window.location.hash || '#';

        if (postLoadObserver) {
            postLoadObserver.disconnect();
        }

        // Noto Color Emojiのクラス付与(現在稼働停止中)
        document.body.classList.toggle(
            'notocoloremoji',
            currentUser?.setting?.emoji == 'notocoloremoji',
        );

        try {
            if (hash.startsWith('#post/'))
                await showPostDetail(hash.substring(6));
            else if (hash.startsWith('#profile/')) {
                const path = hash.substring(9);
                const userId = parseInt(path, 10);
                if (isNaN(userId)) {
                    window.location.hash = '#';
                    return;
                }
                const subpageMatch = path.match(/\/(.+)/);
                const subpage = subpageMatch ? subpageMatch[1] : 'posts';
                await showProfileScreen(userId, subpage);
            } else if (hash.startsWith('#search/'))
                await showSearchResults(decodeURIComponent(hash.substring(8)));
            else if (hash === '#admin/logs' && currentUser?.admin)
                await showAdminLogsScreen();
            else if (hash.startsWith('#dm/'))
                await showDmScreen(hash.substring(4));
            else if (hash === '#dm') await showDmScreen();
            else if (hash === '#settings' && currentUser)
                await showSettingsScreen();
            else if (hash === '#explore') await showExploreScreen();
            else if (hash === '#notifications' && currentUser)
                await showNotificationsScreen();
            else if (hash === '#likes' && currentUser) await showLikesScreen();
            else if (hash === '#stars' && currentUser) await showStarsScreen();
            else await showMainScreen();
        } catch (error) {
            console.error('Routing error:', error);
            DOM.pageHeader.innerHTML = `<h2>エラー</h2>`;
            showScreen('main-screen');
            DOM.timeline.innerHTML = `<p class="error-message">ページの読み込み中にエラーが発生しました。</p>`;
        } finally {
            // `showAdminLogsScreen`内で個別にローディングを解除するため、ここでの一括解除は不要
            // showLoading(false);
        }
    }

    // --- 6. ナビゲーションとサイドバー ---
    async function loadRightSidebar() {
        if (DOM.rightSidebar.searchWidget) {
            DOM.rightSidebar.searchWidget.innerHTML = ` <div class="sidebar-search-widget"> ${ICONS.explore} <input type="search" id="sidebar-search-input" placeholder="検索"> </div>`;
            document
                .getElementById('sidebar-search-input')
                .addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        const query = e.target.value.trim();
                        if (query) {
                            window.location.hash = `#search/${encodeURIComponent(query)}`;
                        }
                    }
                });
        }

        let query = supabase.from('user').select('id, name, scid, icon_data');
        if (currentUser) {
            query = query.neq('id', currentUser.id);
        }
        const { data, error } = await query
            .order('time', { ascending: false })
            .limit(3);

        const linkItems = [
            { name: 'NyaXルール', link: '/rule' },
            /*{ name: '各種ランキング', link: 'ranking' },*/
            { name: '統計', link: '/stat' },
            { name: '申請フォーム', link: '/forms' },
            { name: 'Emoji一覧', link: '/emoji' },
            { name: 'Discord鯖', link: '/discord' },
        ];

        if (error || !data || data.length === 0) {
            if (DOM.rightSidebar.recommendations)
                DOM.rightSidebar.recommendations.innerHTML = '';
            return;
        }
        let recHTML = '<div class="widget-title">おすすめユーザー</div>';
        recHTML += data
            .map((user) => {
                const isFollowing = currentUser?.follow?.includes(user.id);
                const btnClass = isFollowing
                    ? 'follow-button-following'
                    : 'follow-button-not-following';
                const btnText = isFollowing ? 'フォロー中' : 'フォロー';
                return ` <div class="widget-item recommend-user"> <a href="#profile/${user.id}" class="profile-link" style="text-decoration:none; color:inherit; display:flex; align-items:center; gap:0.5rem;"> <img src="${getUserIconUrl(user)}" style="width:40px;height:40px;border-radius:50%;" alt="${escapeHTML(user.name)}'s icon"> <div> <span>${getEmoji(escapeHTML(user.name))}</span> <small style="color:var(--secondary-text-color); display:block;">#${user.id}</small> </div> </a> ${currentUser && currentUser.id !== user.id ? `<button class="${btnClass}" data-user-id="${user.id}">${btnText}</button>` : ''} </div>`;
            })
            .join('');
        if (DOM.rightSidebar.recommendations)
            DOM.rightSidebar.recommendations.innerHTML = `<div class="sidebar-widget">${recHTML}</div>`;
        DOM.rightSidebar.recommendations
            ?.querySelectorAll('.recommend-user button')
            .forEach((button) => {
                const userId = parseInt(button.dataset.userId);
                if (!isNaN(userId)) {
                    const isFollowing = currentUser?.follow?.includes(userId);
                    updateFollowButtonState(button, isFollowing);
                    button.onclick = () =>
                        window.handleFollowToggle(userId, button);
                }
            });

        DOM.rightSidebar.links.innerHTML = linkItems
            .map((item) => {
                return `
            <a href="${item.link}" class="link">${item.name}</a>
            `;
            })
            .join('');
    }

    async function updateNavAndSidebars() {
        const hash = window.location.hash || '#';
        const menuItems = [
            { name: 'ホーム', hash: '#', icon: ICONS.home },
            { name: '検索', hash: '#explore', icon: ICONS.explore },
        ];
        if (currentUser && !currentUser.notice_count_fetched_recently) {
            const { data: updatedUser, error } = await supabase
                .from('user')
                .select('notice, notice_count')
                .eq('id', currentUser.id)
                .single();
            if (!error && updatedUser) {
                currentUser.notice = updatedUser.notice;
                currentUser.notice_count = updatedUser.notice_count;
            }
            currentUser.notice_count_fetched_recently = true;
            setTimeout(() => {
                if (currentUser)
                    currentUser.notice_count_fetched_recently = false;
            }, 10000);
        }
        if (currentUser) {
            const { data: unreadDmCounts, error: unreadDmError } =
                await supabase.rpc('get_all_unread_dm_counts', {
                    p_user_id: currentUser.id,
                });
            let totalUnreadDmCount = 0;
            if (!unreadDmError && unreadDmCounts) {
                currentUser.unreadDmCountsData = unreadDmCounts;
                totalUnreadDmCount = unreadDmCounts.reduce(
                    (sum, item) => sum + item.unread_count,
                    0,
                );
            }

            menuItems.push(
                {
                    name: '通知',
                    hash: '#notifications',
                    icon: ICONS.notifications,
                    badge: currentUser.notice_count,
                },
                { name: 'いいね', hash: '#likes', icon: ICONS.likes },
                { name: 'お気に入り', hash: '#stars', icon: ICONS.stars },
                {
                    name: 'メッセージ',
                    hash: '#dm',
                    icon: ICONS.dm,
                    badge: totalUnreadDmCount,
                },
                {
                    name: 'プロフィール',
                    hash: `#profile/${currentUser.id}`,
                    icon: ICONS.profile,
                },
                { name: '設定', hash: '#settings', icon: ICONS.settings },
            );
        }

        DOM.navLogo.innerHTML = `<a href="#" class="nav-logo-img">${ICONS.nyax_logo}</a>`;

        DOM.navMenuTop.innerHTML = menuItems
            .map((item) => {
                let isActive = false;
                if (item.hash === '#') {
                    isActive = hash === '#' || hash === '';
                } else {
                    isActive = hash.startsWith(item.hash);
                }
                return `
                <a href="${item.hash}" class="nav-item ${isActive ? 'active' : ''}">
                    <div class="nav-item-icon-container">
                        ${item.icon}
                        ${item.badge && item.badge > 0 ? `<span class="notification-badge">${item.badge > 99 ? '99+' : item.badge}</span>` : ''}
                    </div>
                    <span class="nav-item-text">${item.name}</span>
                </a>`;
            })
            .join('');
        if (currentUser)
            DOM.navMenuTop.innerHTML += `<button class="nav-item nav-item-post"><span class="nav-item-text">ポスト</span><span class="nav-item-icon">${ICONS.send}</span></button>`;
        // 未ログイン時は何も表示せず、ログインしている場合のみアカウントボタンを表示する
        DOM.navMenuBottom.innerHTML = currentUser
            ? `<button id="account-button" class="nav-item account-button"> <img src="${getUserIconUrl(currentUser)}" class="user-icon" alt="${escapeHTML(currentUser.name)}'s icon"> <div class="account-info"> <span class="name">${getEmoji(escapeHTML(currentUser.name))}</span> <span class="id">#${currentUser.id}</span> </div> </button>`
            : '';
        DOM.loginBanner.classList.toggle('hidden', !!currentUser);
        DOM.navMenuTop.querySelectorAll('a.nav-item').forEach((link) => {
            link.onclick = (e) => {
                // hashchangeイベントに任せるため、preventDefaultはしない
            };
        });
        // ログアウトボタン（account-button）が存在する場合のみイベントリスナーを設定
        DOM.navMenuBottom
            .querySelector('#account-button')
            ?.addEventListener('click', openAccountSwitcherModal);
        DOM.navMenuTop
            .querySelector('.nav-item-post')
            ?.addEventListener('click', () => openPostModal());
        const PostButton = document.getElementsByClassName('nav-item-post')[0];
        const AccountButton = document.getElementById('account-button');
        if (PostButton) {
            if (
                window.matchMedia('(max-width:680px)').matches &&
                location.hash.startsWith('#dm')
            ) {
                if (!PostButton.classList.contains('hidden')) {
                    PostButton.classList.add('hidden');
                }
            } else if (PostButton.classList.contains('hidden')) {
                PostButton.classList.remove('hidden');
            }
        }
        if (AccountButton) {
            if (
                window.matchMedia('(max-width:680px)').matches &&
                location.hash.startsWith('#dm')
            ) {
                if (!AccountButton.classList.contains('hidden')) {
                    AccountButton.classList.add('hidden');
                }
            } else if (AccountButton.classList.contains('hidden')) {
                AccountButton.classList.remove('hidden');
            }
        }
        loadRightSidebar();
    }

    // --- 7. 認証とセッション ---
    function goToLoginPage() {
        window.location.href = 'login.html';
    }
    function handleLogout() {
        if (!confirm('ログアウトしますか？')) return;
        const userId = currentUser?.id;
        if (!userId) return;
        removeAccountFromList(userId);
        const accounts = getAccountList();
        if (accounts.length > 0) {
            // 次のアカウントでログイン
            supabase.auth.setSession(accounts[0].token).then(() => {
                checkSession();
            });
        } else {
            // 全部消えたら完全ログアウト
            supabase.auth.signOut().then(() => {
                currentUser = null;
                if (realtimeChannel) {
                    supabase.removeChannel(realtimeChannel);
                    realtimeChannel = null;
                }
                window.location.hash = '#';
                router();
            });
        }
    }
    async function checkSession() {
        const {
            data: { session },
            error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError || !session) {
            const accounts = getAccountList();
            while (accounts.length) {
                const {
                    data: { session: _sess },
                    error: _sess_err,
                } = await supabase.auth.setSession(accounts[0].token);
                if (_sess_err || !_sess) {
                    accounts.splice(0, 1);
                    setAccountList(accounts);
                    continue;
                } else {
                    return checkSession(); // 直前にセッションの確認をしたため無限ループの可能性は低い
                }
            }
            currentUser = null;
            router();
            return;
        }

        if (session) {
            try {
                const authUserId = session.user.id;

                const { data, error } = await supabase
                    .from('user')
                    .select('*')
                    .eq('uuid', authUserId)
                    .single();

                if (error || !data)
                    throw new Error('ユーザーデータの取得に失敗しました。');

                currentUser = data;

                if (currentUser.frieze) {
                    DOM.freezeReason.textContent = currentUser.frieze;
                    DOM.freezeOverlay.classList.remove('hidden');
                    return;
                }

                addAccountToList(currentUser, session);
                subscribeToChanges();
                router();
            } catch (error) {
                console.error(error);
                currentUser = null;
                DOM.connectionErrorOverlay.classList.remove('hidden');
            }
        } else {
            currentUser = null;
            router();
        }
    }

    function getAccountList() {
        return JSON.parse(localStorage.getItem('nyax_accounts') || '[]');
    }
    function setAccountList(list) {
        localStorage.setItem('nyax_accounts', JSON.stringify(list));
    }
    function addAccountToList(user, session) {
        // 既存と重複チェック
        let accounts = getAccountList();
        if (accounts.find((a) => a.id === user.id)) {
            while (accounts.find((a) => a.id === user.id)) {
                const Index = accounts.findIndex((a) => a.id === user.id);
                accounts.splice(Index, 1);
            }
        }
        accounts.push({
            id: user.id,
            name: user.name,
            icon_data: user.icon_data,
            scid: user.scid,
            token: session, // { access_token, refresh_token }
        });
        setAccountList(accounts);
    }
    function removeAccountFromList(userId) {
        let accounts = getAccountList().filter((a) => a.id !== userId);
        setAccountList(accounts);
    }
    function updateAccountData(user) {
        // 名前・アイコンなど変更時にリストも更新
        let accounts = getAccountList();
        let idx = accounts.findIndex((a) => a.id === user.id);
        if (idx !== -1) {
            accounts[idx] = {
                ...accounts[idx],
                name: user.name,
                icon_data: user.icon_data,
                scid: user.scid,
            };
            setAccountList(accounts);
        }
    }

    // --- AccountSwitcherモーダルの描画・操作 ---
    function openAccountSwitcherModal() {
        const modal = document.getElementById('account-switcher-modal');
        const content = document.getElementById(
            'account-switcher-modal-content',
        );
        const accounts = getAccountList();
        const currentId = currentUser?.id;

        content.innerHTML = `
            <button class="account-switcher-add-btn">＋ アカウント追加</button>
            <ul class="account-switcher-list">
                ${accounts
                    .map(
                        (acc) => `
                    <li class="account-switcher-item${acc.id === currentId ? ' active' : ''}" data-id="${acc.id}">
                        <span class="switcher-user-info">
                            <img class="switcher-user-icon" src="${getUserIconUrl(acc)}">
                            <span>${getEmoji(escapeHTML(acc.name))}</span>
                            <span style="color:var(--secondary-text-color); font-size:0.95em;">#${acc.id}</span>
                        </span>
                        <button class="switcher-delete-btn" title="このアカウントを削除">×</button>
                    </li>`,
                    )
                    .join('')}
            </ul>
        `;
        modal.classList.remove('hidden');
        modal.querySelector('.modal-close-btn').onclick = () =>
            modal.classList.add('hidden');
        content.querySelector('.account-switcher-add-btn').onclick = () => {
            // 現在のセッションも記録してからlogin.htmlへ
            if (currentUser && supabase?.auth?.getSession) {
                supabase.auth.getSession().then(({ data }) => {
                    if (data?.session && currentUser) {
                        addAccountToList(currentUser, data.session);
                    }
                    window.location.href = 'login.html';
                });
            } else {
                window.location.href = 'login.html';
            }
        };
        content.querySelectorAll('.account-switcher-item').forEach((item) => {
            const userId = Number(item.dataset.id);
            item.onclick = (e) => {
                if (e.target.classList.contains('switcher-delete-btn')) {
                    // 削除
                    if (confirm('このアカウントをリストから削除しますか？')) {
                        removeAccountFromList(userId);
                        if (userId === currentId) {
                            supabase.auth
                                .signOut()
                                .then(() => window.location.reload());
                        } else {
                            openAccountSwitcherModal();
                        }
                    }
                } else if (userId !== currentId) {
                    // 切り替え
                    const acc = accounts.find((a) => a.id === userId);
                    if (acc && acc.token) {
                        // セッション保存
                        supabase.auth.getSession().then(({ data }) => {
                            if (data?.session && currentUser) {
                                addAccountToList(currentUser, data.session);
                            }
                        });
                        // アカウント切り替え処理
                        supabase.auth.setSession(acc.token).then(() => {
                            document
                                .getElementById('account-switcher-modal')
                                .classList.add('hidden');
                            checkSession();
                        });
                    }
                }
            };
        });
    }

    // --- 8. ポスト関連のUIとロジック ---
    function openPostModal(replyInfo = null) {
        if (!currentUser) return goToLoginPage();
        DOM.postModal.classList.remove('hidden');
        const modalContainer = DOM.postModal.querySelector(
            '.post-form-container-modal',
        );
        modalContainer.innerHTML =
            createPostFormHTML(true) +
            `<div id="quoting-preview-container"></div>`;
        attachPostFormListeners(modalContainer);

        if (replyInfo) {
            replyingTo = replyInfo;
            const replyInfoDiv = modalContainer.querySelector('#reply-info');
            replyInfoDiv.innerHTML = `<span>@${escapeHTML(replyInfo.name)}に返信中</span>`;
            replyInfoDiv.classList.remove('hidden');
        }

        if (quotingPost) {
            // 引用返信の注意文
            const QuoterepryInfoDiv =
                modalContainer.querySelector('#reply-info');
            QuoterepryInfoDiv.innerHTML = `<span>注意: 引用を返信代わりに使用する行為は推奨されていません。</span>`;
            QuoterepryInfoDiv.classList.remove('hidden');
            // 引用先のプレビュー
            const previewContainer = modalContainer.querySelector(
                '#quoting-preview-container',
            );
            const nestedPost = document.createElement('div');
            nestedPost.className = 'nested-repost-container';
            nestedPost.innerHTML = `<div class="post-header"><img src="${getUserIconUrl(quotingPost.user)}" class="user-icon" style="width:24px;height:24px;"> <span class="post-author">${getEmoji(escapeHTML(quotingPost.user.name))}</span></div><div class="post-content">${escapeHTML(quotingPost.content)}</div>`;
            previewContainer.appendChild(nestedPost);
        }

        DOM.postModal.querySelector('.modal-close-btn').onclick =
            closePostModal;
        modalContainer.querySelector('textarea').focus();
    }
    function closePostModal() {
        DOM.postModal.classList.add('hidden');
        replyingTo = null;
        quotingPost = null;
        selectedFiles = [];
    }
    const handleCtrlEnter = (e) => {
        if (e.ctrlKey && e.key === 'Enter') {
            e.target
                .closest('.post-form')
                .querySelector('button[id^="post-submit-button"]')
                .click();
        }
    };

    function openRepostModal(post, triggerButton) {
        closePostModal();

        const modalId = `repost-menu-${post.id}`;
        if (document.getElementById(modalId)) return;

        const menu = document.createElement('div');
        menu.id = modalId;
        menu.className = 'post-menu is-visible';

        const simpleRepostBtn = document.createElement('button');
        simpleRepostBtn.textContent = 'リポスト';
        simpleRepostBtn.onclick = (e) => {
            e.stopPropagation();
            handleSimpleRepost(post.id);
            menu.remove();
        };

        const quotePostBtn = document.createElement('button');
        quotePostBtn.textContent = '引用ポスト';
        quotePostBtn.onclick = (e) => {
            e.stopPropagation();
            quotingPost = post;
            openPostModal();
            menu.remove();
        };

        menu.appendChild(simpleRepostBtn);
        menu.appendChild(quotePostBtn);

        const button = triggerButton;
        if (button) {
            document.body.appendChild(menu);
            const btnRect = button.getBoundingClientRect();
            menu.style.position = 'absolute';
            menu.style.top = `${window.scrollY + btnRect.top - menu.offsetHeight}px`;
            menu.style.left = `${window.scrollX + btnRect.left}px`;
            menu.style.right = 'auto';
        }

        setTimeout(() => {
            document.addEventListener('click', () => menu.remove(), {
                once: true,
            });
        }, 0);
    }

    async function handleSimpleRepost(postId) {
        if (!currentUser) return alert('ログインが必要です。');
        showLoading(true);
        try {
            // リポスト先の投稿者情報を通知のために取得
            const { data: originalPost, error: fetchError } = await supabase
                .from('post')
                .select('userid')
                .eq('id', postId)
                .single();

            if (fetchError) throw fetchError;

            // content, reply_id, attachments は null を指定
            const { error: rpcError } = await supabase.rpc('create_post_new', {
                p_content: null,
                p_reply_id: null,
                p_repost_to: postId,
                p_attachments: null,
                p_mask: false,
            });

            if (rpcError) {
                // SQL関数からのエラーメッセージ（連投制限など）をユーザーに表示
                throw rpcError;
            }

            // 通知を送信
            sendNotification(
                originalPost.userid,
                `@${currentUser.id}さんがあなたのポストをリポストしました。`,
                `#post/${postId}`,
            );

            router(); // タイムラインを更新
        } catch (e) {
            console.error(e);
            // エラーメッセージから "Error: " の部分を取り除く
            const friendlyMessage = e.message.replace(/^Error: /, '');
            alert(`リポストに失敗しました: ${friendlyMessage}`);
        } finally {
            showLoading(false);
        }
    }

    function createPostFormHTML(isModal) {
        return `
            <div class="post-form">
                <img src="${getUserIconUrl(currentUser)}" class="user-icon" alt="your icon">
                ${isModal ? '<button class="modal-close-btn">×</button>' : ''}
                <div class="form-content">
                    <div id="reply-info" class="hidden" style="margin-bottom: 0.5rem; color: var(--secondary-text-color);"></div>
                    <textarea id="post-content" placeholder="いまどうしてる？" maxlength="280"></textarea>
                    <div class="file-preview-container"></div>
                    <div class="post-form-actions">
                        <button type="button" class="attachment-button float-left" title="ファイルを添付">
                            ${ICONS.attachment}
                        </button>
                        <button type="button" class="emoji-pic-button float-left" title="絵文字を選択">
                            ${ICONS.emoji}
                        </button>
                        <input type="file" id="file-input" class="hidden" multiple>
                        <div id="emoji-picker" class="hidden"></div>
                        <button id="post-submit-button" class="float-right">ポスト</button>
                        <button type="button" class="post-mask-button float-right" title="ワンクッション">
                            ${ICONS.mask}
                        </button>
                        <span class="float-clear"></span>
                    </div>
                </div>
            </div>`;
    }
    async function attachPostFormListeners(container) {
        await emoji_picker_create(container);

        container
            .querySelector('.attachment-button')
            .addEventListener('click', () => {
                container.querySelector('#file-input').click();
            });
        container
            .querySelector('#file-input')
            .addEventListener('change', (e) =>
                handleFileSelection(e, container),
            );
        container
            .querySelector('.post-mask-button')
            .addEventListener('click', () => handlePostMask(container));
        container
            .querySelector('#post-submit-button')
            .addEventListener('click', () => handlePostSubmit(container));
        container
            .querySelector('textarea')
            .addEventListener('keydown', handleCtrlEnter);
    }

    async function compressImage(file) {
        return new Promise((resolve, reject) => {
            // 画像以外のファイルはそのまま返す
            if (!file.type.startsWith('image/')) {
                resolve(file);
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    // 最大サイズの設定
                    const MAX_WIDTH = 1920;
                    const MAX_HEIGHT = 1920;
                    const JPEG_QUALITY = 0.85; // 品質 (85)

                    let { width, height } = img;

                    if (width > MAX_WIDTH || height > MAX_HEIGHT) {
                        const ratio = Math.min(
                            MAX_WIDTH / width,
                            MAX_HEIGHT / height,
                        );
                        width = Math.round(width * ratio);
                        height = Math.round(height * ratio);
                    }

                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');

                    ctx.imageSmoothingEnabled = true;
                    ctx.imageSmoothingQuality = 'high';

                    ctx.drawImage(img, 0, 0, width, height);

                    // PNG/WebPで透明度がある場合はそのまま、それ以外はJPEGに変換
                    let outputType = 'image/jpeg';
                    let quality = JPEG_QUALITY;

                    if (
                        file.type === 'image/png' ||
                        file.type === 'image/webp'
                    ) {
                        const imageData = ctx.getImageData(0, 0, width, height);
                        const hasTransparency = imageData.data.some(
                            (_, i) => i % 4 === 3 && imageData.data[i] < 255,
                        );

                        if (hasTransparency) {
                            outputType = 'image/png';
                            quality = 0.9; // PNGのみ品質を90にする
                        }
                    }

                    canvas.toBlob(
                        (blob) => {
                            if (!blob) {
                                reject(new Error('画像の圧縮に失敗しました'));
                                return;
                            }

                            // 圧縮後のファイルサイズが元より大きい場合は元のファイルを使用
                            if (blob.size >= file.size) {
                                resolve(file);
                                return;
                            }

                            // 拡張子の設定
                            const extension =
                                outputType === 'image/jpeg' ? '.jpg' : '.png';
                            const originalName = file.name.replace(
                                /\.[^/.]+$/,
                                '',
                            );
                            const compressedFile = new File(
                                [blob],
                                originalName + extension,
                                {
                                    type: outputType,
                                    lastModified: Date.now(),
                                },
                            );

                            // 確認用
                            //console.log(`画像圧縮完了: ${(file.size / 1024).toFixed(1)}KB → ${(blob.size / 1024).toFixed(1)}KB (${((1 - blob.size / file.size) * 100).toFixed(1)}% OFF)`);
                            resolve(compressedFile);
                        },
                        outputType,
                        quality,
                    );
                };

                img.onerror = () =>
                    reject(new Error('画像の読み込みに失敗しました'));
                img.src = e.target.result;
            };

            reader.onerror = () =>
                reject(new Error('ファイルの読み込みに失敗しました'));
            reader.readAsDataURL(file);
        });
    }

    async function handleFileSelection(event, container) {
        const previewContainer = container.querySelector(
            '.file-preview-container',
        );

        previewContainer.innerHTML =
            '<div class="spinner" style="margin: 1rem;"></div>'; // 処理中表示

        const files = Array.from(event.target.files);
        const compressedFiles = [];

        // 画像を圧縮
        for (const file of files) {
            try {
                const compressed = await compressImage(file);
                compressedFiles.push(compressed);
            } catch (error) {
                console.error('ファイル処理エラー:', error);
                compressedFiles.push(file); // エラー時は元ファイルを使用する
            }
        }

        selectedFiles = compressedFiles;

        previewContainer.innerHTML = '';

        selectedFiles.forEach((file, index) => {
            const previewItem = document.createElement('div');
            previewItem.className = 'file-preview-item';

            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    previewItem.innerHTML = `<img src="${e.target.result}" alt="${escapeHTML(file.name)}"><button class="file-preview-remove" data-index="${index}">×</button>`;
                    previewContainer.appendChild(previewItem);
                };
                reader.readAsDataURL(file);
            } else if (file.type.startsWith('video/')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    previewItem.innerHTML = `<video src="${e.target.result}" controls></video><button class="file-preview-remove" data-index="${index}">×</button>`;
                    previewContainer.appendChild(previewItem);
                };
                reader.readAsDataURL(file);
            } else if (file.type.startsWith('audio/')) {
                previewItem.innerHTML = `<span>${getEmoji('🎵')} ${getEmoji(escapeHTML(file.name))}</span><button class="file-preview-remove" data-index="${index}">×</button>`;
                previewContainer.appendChild(previewItem);
            } else {
                previewItem.innerHTML = `<span>${getEmoji('📄')} ${getEmoji(escapeHTML(file.name))}</span><button class="file-preview-remove" data-index="${index}">×</button>`;
                previewContainer.appendChild(previewItem);
            }
        });

        previewContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('file-preview-remove')) {
                const indexToRemove = parseInt(e.target.dataset.index);
                selectedFiles.splice(indexToRemove, 1);
                handleFileSelection(
                    { target: { files: new DataTransfer().files } },
                    container,
                );
                const newFiles = new DataTransfer();
                selectedFiles.forEach((file) => newFiles.items.add(file));
                container.querySelector('#file-input').files = newFiles.files;
            }
        });
    }

    function handlePostMask(container) {
        const button = container.querySelector('.post-mask-button');

        button.classList.toggle('active');
    }

    async function handlePostSubmit(container) {
        if (!currentUser) return alert('ログインが必要です。');
        const contentEl = container.querySelector('textarea');
        const content = contentEl.value.trim();
        if (!content && selectedFiles.length === 0 && !quotingPost)
            return alert('内容を入力するか、ファイルを添付してください。');

        const maskActive = container
            .querySelector('.post-mask-button')
            .classList.contains('active');

        const button = container.querySelector('#post-submit-button');
        button.disabled = true;
        button.textContent = '投稿中...';
        showLoading(true);

        let attachmentsData = [];
        let uploadedFileIds = []; // 削除用にファイルIDを保持

        try {
            // 1. ファイルがあれば先にアップロード
            for (const file of selectedFiles) {
                const fileId = await uploadFileViaEdgeFunction(file);
                uploadedFileIds.push(fileId); // 削除候補としてIDを保存
                const fileType = file.type.startsWith('image/')
                    ? 'image'
                    : file.type.startsWith('video/')
                        ? 'video'
                        : file.type.startsWith('audio/')
                            ? 'audio'
                            : 'file';
                attachmentsData.push({
                    type: fileType,
                    id: fileId,
                    name: file.name,
                });
            }

            // 2. 新しいRPC関数を呼び出してポストをDBに保存
            const { data: newPost, error: rpcError } = await supabase
                .rpc('create_post_new', {
                    p_content: content,
                    p_reply_id: replyingTo?.id || null,
                    p_repost_to: quotingPost?.id || null,
                    p_attachments:
                        attachmentsData.length > 0 ? attachmentsData : null,
                    p_mask: maskActive,
                })
                .single(); // .single()を追加して、返り値が1行であることを期待

            // 3. RPCでエラーが発生したら、ファイルを削除して処理を中断
            if (rpcError) {
                throw rpcError; // catchブロックに処理を移譲
            }

            // --- 通知送信ロジック (変更なし) ---
            let repliedUserId = null;
            if (replyingTo) {
                const { data: parentPost } = await supabase
                    .from('post')
                    .select('userid')
                    .eq('id', replyingTo.id)
                    .single();
                if (parentPost && parentPost.userid !== currentUser.id) {
                    repliedUserId = parentPost.userid;
                    sendNotification(
                        repliedUserId,
                        `@${currentUser.id}さんがあなたのポストに返信しました。`,
                        `#post/${newPost.id}`,
                    );
                }
            }
            if (quotingPost) {
                repliedUserId = quotingPost.userid; // リプライと引用ポストの両立は不可能のはずなので大丈夫
                sendNotification(
                    repliedUserId,
                    `@${currentUser.id}さんがあなたのポストを引用しました。`,
                    `#post/${quotingPost.id}`,
                );
            }
            const mentionedIds = new Set();
            for (const match of content.matchAll(/@(\d+)/g)) {
                const mentionedId = parseInt(match[1]);
                if (
                    mentionedId !== currentUser.id &&
                    mentionedId !== repliedUserId
                ) {
                    mentionedIds.add(mentionedId);
                }
            }
            mentionedIds.forEach((id) => {
                sendNotification(
                    id,
                    `@${currentUser.id}さんがあなたをメンションしました。`,
                    `#post/${newPost.id}`,
                );
            });
            // --- 通知送信ロジックここまで ---

            // 成功時の後処理
            selectedFiles = [];
            contentEl.value = '';
            container.querySelector('.file-preview-container').innerHTML = '';
            if (container.closest('.modal-overlay')) {
                closePostModal();
            }

            if (window.location.hash === '#' || window.location.hash === '') {
                await router();
            }
        } catch (e) {
            console.error('ポスト送信に失敗しました:', e);
            if (uploadedFileIds.length > 0) {
                console.warn(
                    '投稿に失敗したため、アップロード済みファイルを削除します:',
                    uploadedFileIds,
                );
                await deleteFilesViaEdgeFunction(uploadedFileIds);
            }
            // ユーザーにエラーメッセージを表示
            alert(`投稿に失敗しました: ${e.message}`);
        } finally {
            // 最後に必ずボタンの状態を元に戻す
            button.disabled = false;
            button.textContent = 'ポスト';
            showLoading(false);
        }
    }

    async function uploadFileViaEdgeFunction(file) {
        const formData = new FormData();
        formData.append('file', file);

        const { data, error } = await supabase.functions.invoke('upload-file', {
            body: formData,
        });

        if (error) {
            throw new Error(
                `ファイルアップロードに失敗しました: ${error.message}`,
            );
        }

        // Edge Functionからの戻り値はdataの中にさらにdataプロパティがある場合がある
        const responseData = data.data || data;
        if (responseData.error) {
            throw new Error(
                `ファイルアップロードに失敗しました: ${responseData.error}`,
            );
        }

        return responseData.fileId;
    }

    async function deleteFilesViaEdgeFunction(fileIds) {
        if (!fileIds || fileIds.length === 0) return;

        const { error } = await supabase.functions.invoke('delete-files', {
            body: JSON.stringify({ fileIds: fileIds }),
        });

        if (error) {
            console.error('ファイルの削除に失敗しました:', error.message);
            // ここではエラーをthrowせず、コンソールに出力するに留める
        }
    }

    window.openImageModal = (src) => {
        DOM.imagePreviewModalContent.src = src;
        DOM.imagePreviewModal.classList.remove('hidden');
    };
    window.closeImageModal = () => {
        DOM.imagePreviewModal.classList.add('hidden');
        DOM.imagePreviewModalContent.src = '';
    };

    window.handleDownload = async (fileUrl, fileName) => {
        try {
            const response = await fetch(fileUrl);
            if (!response.ok) throw new Error('ファイルの取得に失敗しました。');
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            a.remove();
            setTimeout(() => window.URL.revokeObjectURL(url), 1000);
        } catch (e) {
            console.error('ダウンロードエラー:', e);
            alert('ファイルのダウンロードに失敗しました。');
        }
    };

    async function renderPost(post, author, options = {}) {
        await ensureMentionedUsersCached([post.content]);
        const {
            isNested = false,
            isDirectReply = false,
            userCache = new Map(),
            metricsPromise,
            isPinned = false,
        } = options;

        if (!post) return null;

        POST_COUNT += 1;

        const displayAuthor = author || post.author;
        if (!displayAuthor) return null;

        const isSimpleRepost = post.repost_to && !post.content;

        // --- ケース1: シンプルリポスト（コメントなし）の処理 ---
        if (isSimpleRepost) {
            const authorOfRepost = displayAuthor;
            const originalPost = post.reposted_post;

            // リポスト元が削除されている場合
            if (!originalPost) {
                const deletedPostWrapper = document.createElement('div');
                deletedPostWrapper.className = 'post';
                deletedPostWrapper.dataset.postId = post.id;

                const deletedPostMain = document.createElement('div');
                deletedPostMain.className = 'post-main';

                const repostIndicator = document.createElement('div');
                repostIndicator.className = 'repost-indicator';
                repostIndicator.innerHTML = `${ICONS.repost}`; // 安全な内部SVGなのでinnerHTML
                const repostAuthorLink = document.createElement('a');
                repostAuthorLink.href = `#profile/${authorOfRepost.id}`;
                repostAuthorLink.textContent = authorOfRepost.name; // 安全なtextContent
                repostAuthorLink.innerHTML = getEmoji(
                    repostAuthorLink.innerHTML,
                ); // Emoji Oneの変換
                const repostText = document.createElement('span');
                repostText.textContent = ` さんがリポストしました`;
                repostIndicator.appendChild(repostAuthorLink);
                repostIndicator.appendChild(repostText);
                deletedPostMain.appendChild(repostIndicator);

                const deletedContainer = document.createElement('div');
                deletedContainer.className = 'deleted-post-container';
                deletedContainer.textContent = 'このポストは削除されました。'; // 安全なtextContent
                deletedPostMain.appendChild(deletedContainer);

                deletedPostWrapper.appendChild(deletedPostMain);
                return deletedPostWrapper;
            }

            // リポスト元が存在する場合、オリジナルポストを再帰的に描画
            const postEl = await renderPost(originalPost, originalPost.author, {
                ...options,
                isNested: false,
                metricsPromise,
            });
            if (!postEl) return null;

            postEl.dataset.postId = post.id;
            postEl.dataset.actionTargetId = originalPost.id;

            const repostedPostMain = postEl.querySelector('.post-main');
            if (repostedPostMain) {
                const repostIndicator = document.createElement('div');
                repostIndicator.className = 'repost-indicator';
                repostIndicator.innerHTML = `${ICONS.repost}`;
                const repostAuthorLink = document.createElement('a');
                repostAuthorLink.href = `#profile/${authorOfRepost.id}`;
                repostAuthorLink.textContent = authorOfRepost.name;
                repostAuthorLink.innerHTML = getEmoji(
                    repostAuthorLink.innerHTML,
                ); // Emoji Oneの変換
                const repostText = document.createElement('span');
                repostText.textContent = ` さんがリポストしました`;
                repostIndicator.appendChild(repostAuthorLink);
                repostIndicator.appendChild(repostText);
                repostedPostMain.prepend(repostIndicator);

                const postHeader =
                    repostedPostMain.querySelector('.post-header');
                if (postHeader) {
                    postHeader.querySelector('.post-menu-btn')?.remove();
                    postHeader.querySelector('.post-menu')?.remove();

                    if (
                        currentUser &&
                        !isNested &&
                        (currentUser.id === post.userid || currentUser.admin)
                    ) {
                        const menuBtn = document.createElement('button');
                        menuBtn.className = 'post-menu-btn';
                        menuBtn.innerHTML = '…';
                        const menu = document.createElement('div');
                        menu.className = 'post-menu';
                        const deleteBtn = document.createElement('button');
                        deleteBtn.className = 'delete-btn';
                        deleteBtn.textContent = 'リポストを削除';
                        menu.appendChild(deleteBtn);
                        postHeader.appendChild(menuBtn);
                        postHeader.appendChild(menu);
                    }
                }
            }
            return postEl;
        }

        // ケース2: 通常ポスト、引用ポスト、返信
        if (!author) return null;

        const postEl = document.createElement('div');
        postEl.className = 'post';
        postEl.dataset.postId = post.id;
        postEl.dataset.actionTargetId = post.id;

        // ユーザーアイコン
        const userIconLink = document.createElement('a');
        userIconLink.href = `#profile/${displayAuthor.id}`;
        userIconLink.className = 'user-icon-link';
        const userIcon = document.createElement('img');
        userIcon.src = getUserIconUrl(displayAuthor);
        userIcon.className = 'user-icon';
        userIcon.alt = `${displayAuthor.name}'s icon`;
        userIconLink.appendChild(userIcon);
        postEl.appendChild(userIconLink);

        // ポストの右側メイン部分
        const postMain = document.createElement('div');
        postMain.className = 'post-main';

        // ピン留め表示/返信先表示
        if (isPinned) {
            const pinnedDiv = document.createElement('div');
            pinnedDiv.className = 'pinned-indicator';
            pinnedDiv.innerHTML = `${ICONS.pin} <span>ピン留めされたポスト</span>`;
            postMain.appendChild(pinnedDiv);
        } else if (!isDirectReply) {
            if (post.reply_to_post && post.reply_to_post.author) {
                // (インジケーターを生成するDOM操作は変更なし)
                const replyDiv = document.createElement('div');
                replyDiv.className = 'replying-to';
                const replyAuthorLink = document.createElement('a');
                replyAuthorLink.href = `#profile/${post.reply_to_post.author.id}`;
                replyAuthorLink.textContent = `@${post.reply_to_post.author.name}`;
                replyAuthorLink.innerHTML = getEmoji(replyAuthorLink.innerHTML); // Emoji Oneの変換
                const replyText = document.createElement('span');
                replyText.textContent = ` さんに返信`;
                replyDiv.appendChild(replyAuthorLink);
                replyDiv.appendChild(replyText);
                postMain.appendChild(replyDiv);
            } else if (post.reply_to_user_id && post.reply_to_user_name) {
                // (インジケーターを生成するDOM操作は変更なし)
                const replyDiv = document.createElement('div');
                replyDiv.className = 'replying-to';
                const replyAuthorLink = document.createElement('a');
                replyAuthorLink.href = `#profile/${post.reply_to_user_id}`;
                replyAuthorLink.textContent = `@${post.reply_to_user_name}`;
                replyAuthorLink.innerHTML = getEmoji(replyAuthorLink.innerHTML); // Emoji Oneの変換
                const replyText = document.createElement('span');
                replyText.textContent = ` さんに返信`;
                replyDiv.appendChild(replyAuthorLink);
                replyDiv.appendChild(replyText);
                postMain.appendChild(replyDiv);
            }
        }

        // ポストヘッダー
        const postHeader = document.createElement('div');
        postHeader.className = 'post-header';
        const authorLink = document.createElement('a');
        authorLink.href = `#profile/${displayAuthor.id}`;
        authorLink.className = 'post-author';
        authorLink.textContent = displayAuthor.name || '不明'; // 安全なtextContent
        authorLink.innerHTML = getEmoji(authorLink.innerHTML);
        postHeader.appendChild(authorLink);

        // 管理者・認証済みバッジ
        if (displayAuthor.admin) {
            const adminBadge = document.createElement('img');
            adminBadge.src = 'icons/admin.png';
            adminBadge.className = 'admin-badge';
            adminBadge.title = 'NyaXTeam';
            authorLink.appendChild(adminBadge);
        } else if ((await contributors).includes(displayAuthor.id)) {
            const contributorBadge = document.createElement('img');
            contributorBadge.src = 'icons/contributor.png';
            contributorBadge.className = 'contributor-badge';
            contributorBadge.title = '開発協力者';
            authorLink.appendChild(contributorBadge);
        } else if (displayAuthor.verify) {
            const verifyBadge = document.createElement('img');
            verifyBadge.src = 'icons/verify.png';
            verifyBadge.className = 'verify-badge';
            verifyBadge.title = '認証済み';
            authorLink.appendChild(verifyBadge);
        }

        authorLink.insertAdjacentHTML(
            'beforeend',
            await MakeTrustLabel(displayAuthor.id),
        );

        // 投稿日時
        const postTime = document.createElement('span');
        postTime.className = 'post-time';
        postTime.textContent = `#${displayAuthor.id || '????'} · ${new Date(post.time).toLocaleString('ja-JP')}`;
        postHeader.appendChild(postTime);

        // ポストメニューボタン
        if (currentUser && !isNested) {
            const menuBtn = document.createElement('button');
            menuBtn.className = 'post-menu-btn';
            menuBtn.innerHTML = '…';
            const menu = document.createElement('div');
            menu.className = 'post-menu';

            const shareBtn = document.createElement('button');
            shareBtn.className = 'share-btn';
            shareBtn.textContent = 'URLをコピー';
            menu.appendChild(shareBtn);

            if (currentUser.id === post.userid || currentUser.admin) {
                const pinBtn = document.createElement('button');
                pinBtn.className = 'pin-btn';
                if (!currentUser.pin || currentUser.pin !== post.id) {
                    pinBtn.textContent = 'ピン留め';
                } else {
                    pinBtn.textContent = 'ピン留めを解除';
                }
                menu.appendChild(pinBtn);

                if (!post.repost_to || post.content) {
                    const editBtn = document.createElement('button');
                    editBtn.className = 'edit-btn';
                    editBtn.textContent = '編集';
                    menu.appendChild(editBtn);
                }

                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'delete-btn';
                deleteBtn.textContent = '削除';
                menu.appendChild(deleteBtn);
            }

            postHeader.appendChild(menuBtn);
            postHeader.appendChild(menu);
        }
        postMain.appendChild(postHeader);

        if (post.content) {
            const postContent = document.createElement('div');
            postContent.className = 'post-content';

            // maskが有効の場合contentをhidden化&頭に!があればそれだけ表示
            if (post.mask) {
                postContent.classList.add('hidden');
                if (post.content.startsWith('!')) {
                    const masktitle = document.createElement('div');
                    masktitle.className = 'post-content post-mask-title';
                    masktitle.innerHTML = formatPostContent(
                        post.content.split('\n')[0].slice(1),
                        userCache,
                    );
                    postMain.appendChild(masktitle);
                    postContent.innerHTML = formatPostContent(
                        post.content.slice(1),
                        userCache,
                    );
                } else {
                    postContent.innerHTML = formatPostContent(
                        post.content,
                        userCache,
                    );
                }
            } else {
                postContent.innerHTML = formatPostContent(
                    post.content,
                    userCache,
                );
            }
            postMain.appendChild(postContent);
        }

        // maskが有効の場合表示ボタンを追加
        if (post.mask) {
            const postAlert = document.createElement('button');
            postAlert.className = 'post-mask-alert';
            postAlert.innerText =
                'このポストにはワンクッションが付与されています';
            postMain.appendChild(postAlert);
        }

        // 添付ファイル
        if (post.attachments && post.attachments.length > 0) {
            const attachmentsContainer = document.createElement('div');
            attachmentsContainer.className = 'attachments-container';
            // maskが有効の場合attachmentsもhidden化
            if (post.mask) {
                attachmentsContainer.classList.add('hidden');
            } else if (post.attachments.length > 2) {
                const postAlert = document.createElement('button');
                postAlert.className = 'post-mask-alert';
                postAlert.innerText = `${post.attachments.length}件のファイル`;
                postMain.appendChild(postAlert);
                attachmentsContainer.classList.add('hidden');
            }
            if (isNested) {
                const itemDiv = document.createElement('div');
                itemDiv.className = 'attachment-item';

                const fileinfo = document.createElement('p');
                fileinfo.className = 'attachment-fileinfo';
                fileinfo.textContent = `📄 ${post.attachments.length}件のファイル`;
                itemDiv.appendChild(fileinfo);
                attachmentsContainer.appendChild(itemDiv);
            } else {
                for (const attachment of post.attachments) {
                    const { data: publicUrlData } = supabase.storage
                        .from('nyax')
                        .getPublicUrl(attachment.id);
                    const publicURL = escapeHTML(publicUrlData.publicUrl);

                    const itemDiv = document.createElement('div');
                    itemDiv.className = 'attachment-item';

                    if (attachment.type === 'image') {
                        const img = document.createElement('img');
                        img.src = publicURL;
                        img.alt = attachment.name;
                        img.className = 'attachment-image';
                        img.onclick = (e) => {
                            e.stopPropagation();
                            window.openImageModal(publicURL);
                        };
                        itemDiv.appendChild(img);
                    } else if (attachment.type === 'video') {
                        const video = document.createElement('video');
                        video.src = publicURL;
                        video.controls = true;
                        video.onclick = (e) => {
                            e.stopPropagation();
                        };
                        itemDiv.appendChild(video);
                    } else if (attachment.type === 'audio') {
                        const audio = document.createElement('audio');
                        audio.src = publicURL;
                        audio.controls = true;
                        audio.onclick = (e) => {
                            e.stopPropagation();
                        };
                        itemDiv.appendChild(audio);
                    } else {
                        const downloadLink = document.createElement('a');
                        downloadLink.href = '#'; // ページ遷移を防ぐ
                        downloadLink.className = 'attachment-download-link';
                        downloadLink.textContent = `📄 ${attachment.name}`;

                        // onclickイベントで、既存のダウンロード処理関数を呼び出す
                        downloadLink.onclick = (e) => {
                            e.preventDefault(); // href="#"のデフォルトの動作（ページトップへ移動）を防ぐ
                            e.stopPropagation(); // 親要素へのイベント伝播を防ぐ
                            window.handleDownload(publicURL, attachment.name); // 正しいファイル名でダウンロードを開始
                        };
                        itemDiv.appendChild(downloadLink);
                    }
                    attachmentsContainer.appendChild(itemDiv);
                }
            }
            postMain.appendChild(attachmentsContainer);
        }

        // 引用ポスト
        if (post.repost_to && post.content) {
            const nestedContainer = document.createElement('div');
            nestedContainer.className = 'nested-repost-container';
            if (post.reposted_post) {
                const nestedPostEl = await renderPost(
                    post.reposted_post,
                    post.reposted_post.author,
                    { ...options, isNested: true },
                );
                if (nestedPostEl) {
                    nestedContainer.appendChild(nestedPostEl);
                }
            } else {
                const deletedContainer = document.createElement('div');
                deletedContainer.className = 'deleted-post-container';
                deletedContainer.textContent = 'このポストは削除されました。';
                nestedContainer.appendChild(deletedContainer);
            }
            postMain.appendChild(nestedContainer);
        }

        // アクションボタン
        if (currentUser && !isNested) {
            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'post-actions';

            // アクションボタンのステータス表示は、常に表示されているポストの内容(post)に依存する
            // シンプルリポストの場合、その中身(post.reposted_post)にカウントが設定されている
            const actionTargetPost =
                isSimpleRepost && post.reposted_post
                    ? post.reposted_post
                    : post;

            if (actionTargetPost) {
                const replyBtn = document.createElement('button');
                replyBtn.className = 'reply-button';
                replyBtn.dataset.username = escapeHTML(
                    actionTargetPost.user?.name || author.name,
                );
                replyBtn.innerHTML = `${ICONS.reply} <span>---</span>`;
                actionsDiv.appendChild(replyBtn);

                const likeBtn = document.createElement('button');
                likeBtn.className = `like-button ${currentUser.like?.includes(actionTargetPost.id) ? 'liked' : ''}`;
                likeBtn.innerHTML = `${ICONS.likes} <span>---</span>`;
                actionsDiv.appendChild(likeBtn);

                const starBtn = document.createElement('button');
                starBtn.className = `star-button ${currentUser.star?.includes(actionTargetPost.id) ? 'starred' : ''}`;
                starBtn.innerHTML = `${ICONS.stars} <span>---</span>`;
                actionsDiv.appendChild(starBtn);

                const repostBtn = document.createElement('button');
                repostBtn.className = 'repost-button';
                repostBtn.innerHTML = `${ICONS.repost} <span>---</span>`;
                actionsDiv.appendChild(repostBtn);

                (async () => {
                    // 遅延読み込みロジック
                    await metricsPromise;

                    const replyCount =
                        actionTargetPost.reply_count ?? METRICS_FALLBACK;
                    const likeCount =
                        actionTargetPost.like_count ?? METRICS_FALLBACK;
                    const starCount =
                        actionTargetPost.star_count ?? METRICS_FALLBACK;
                    const repostCount =
                        actionTargetPost.repost_count ?? METRICS_FALLBACK;

                    replyBtn.innerHTML = `${ICONS.reply} <span>${replyCount}</span>`;
                    likeBtn.innerHTML = `${ICONS.likes} <span>${likeCount}</span>`;
                    starBtn.innerHTML = `${ICONS.stars} <span>${starCount}</span>`;
                    repostBtn.innerHTML = `${ICONS.repost} <span>${repostCount}</span>`;
                })();
            }

            postMain.appendChild(actionsDiv);
        }

        postEl.appendChild(postMain);
        return postEl;
    }

    function createAdPostHTML() {
        const adContainer = document.createElement('div');
        adContainer.className = 'post ad-post';

        // iframeを使った広告描画用のHTML
        adContainer.innerHTML = `
            <div class="user-icon-link">
                <img src="logo.png" class="user-icon" alt="広告アイコン">
            </div>
            <div class="post-main">
                <div class="post-header">
                    <span class="post-author">[広告]</span>
                </div>
                <div class="post-content">
                    <p>広告は新機能の準備のため停止中です。</p>
                </div>
            </div>
        `;

        // 広告ポスト全体のクリックイベントを止める
        adContainer.addEventListener(
            'click',
            (e) => {
                e.stopPropagation();
            },
            true,
        );

        return adContainer;
    }

    // --- 9. ページごとの表示ロジック ---
    async function showMainScreen() {
        DOM.pageHeader.innerHTML = `<h2 id="page-title">ホーム</h2>`;
        showScreen('main-screen');

        const tabsContainer = document.querySelector('.timeline-tabs');
        if (currentUser) {
            tabsContainer.innerHTML = `
                <button class="timeline-tab-button" data-tab="all">すべて</button>
                <button class="timeline-tab-button" data-tab="foryou">おすすめ</button>
                <button class="timeline-tab-button" data-tab="following">フォロー中</button>
                <button class="timeline-tab-button" data-tab="announce">お知らせ</button>
            `;
            // ユーザー設定からデフォルトタブを取得。なければ 'all' を使用
            currentTimelineTab =
                currentUser.settings?.default_timeline_tab || 'all';
        } else {
            tabsContainer.innerHTML = `
                <button class="timeline-tab-button" data-tab="all">すべて</button>
                <button class="timeline-tab-button" data-tab="announce">お知らせ</button>
            `;
            // 未ログインユーザーのデフォルトは「すべて」固定
            currentTimelineTab = 'all';
        }

        if (currentUser) {
            DOM.postFormContainer.innerHTML = createPostFormHTML(false);
            attachPostFormListeners(DOM.postFormContainer);
        } else {
            DOM.postFormContainer.innerHTML = '';
        }

        await switchTimelineTab(currentTimelineTab);
        showLoading(false);
    }

    async function showExploreScreen() {
        DOM.pageHeader.innerHTML = `
            <div class="header-search-bar">
                ${ICONS.explore}
                <input type="search" id="search-input" placeholder="検索">
            </div>`;
        const searchInput = document.getElementById('search-input');
        const performSearch = () => {
            const query = searchInput.value.trim();
            if (query) {
                window.location.hash = `#search/${encodeURIComponent(query)}`;
            }
        };
        searchInput.onkeydown = (e) => {
            if (e.key === 'Enter') performSearch();
        };

        showScreen('explore-screen');
        const contentDiv = DOM.exploreContent;
        contentDiv.innerHTML = '<div class="spinner"></div>'; // ローディング表示

        try {
            // 新しいSQL関数を呼び出してトレンドを取得
            const { data: trends, error } = await supabase.rpc(
                'get_trending_hashtags',
            );
            if (error) throw error;

            if (trends && trends.length > 0) {
                let trendsHtml = `
                    <div class="trends-widget-container">
                        <div class="trends-widget-title">トレンド</div>
                `;
                trends.forEach((trend, index) => {
                    trendsHtml += `
                        <a href="#search/${encodeURIComponent(trend.tag_name)}" class="trend-item">
                            <div class="trend-item-meta">
                                <span>${index + 1}</span>位
                            </div>
                            <div class="trend-item-name">#${escapeHTML(trend.tag_name)}</div>
                            <div class="trend-item-count">${trend.occurrence_count}件のポスト</div>
                        </a>
                    `;
                });
                trendsHtml += `</div>`;
                contentDiv.innerHTML = trendsHtml;
            } else {
                contentDiv.innerHTML =
                    '<p style="padding: 2rem; text-align: center; color: var(--secondary-text-color);">現在、トレンドはありません。</p>';
            }
        } catch (err) {
            console.error('トレンドの取得に失敗:', err);
            contentDiv.innerHTML =
                '<p style="padding: 2rem; text-align: center; color: var(--secondary-text-color);">トレンドの取得に失敗しました。</p>';
        } finally {
            showLoading(false);
        }
    }

    async function showSearchResults(query) {
        DOM.pageHeader.innerHTML = `
            <div class="header-search-bar">
                ${ICONS.explore}
                <input type="search" id="search-input" placeholder="検索">
            </div>
            <br>
            <h2 id="page-title">検索結果: "${getEmoji(escapeHTML(query))}"</h2>
        `;
        const searchInput = document.getElementById('search-input');
        const performSearch = () => {
            const query = searchInput.value.trim();
            if (query) {
                window.location.hash = `#search/${encodeURIComponent(query)}`;
            }
        };
        searchInput.onkeydown = (e) => {
            if (e.key === 'Enter') performSearch();
        };

        showScreen('search-results-screen');
        const contentDiv = DOM.searchResultsContent;
        contentDiv.innerHTML = '';

        const postContainer = document.createElement('div');
        contentDiv.appendChild(postContainer);
        const userResultsContainer = document.createElement('div');
        contentDiv.appendChild(userResultsContainer);
        const postResultsContainer = document.createElement('div');
        contentDiv.appendChild(postResultsContainer);

        if (currentUser) {
            const tagPostButton = document.createElement('button');
            tagPostButton.className = 'tag-post-button';
            tagPostButton.innerHTML = 'このタグでポストする';
            tagPostButton.addEventListener('click', async () => {
                if (!currentUser) return goToLoginPage();
                DOM.postModal.classList.remove('hidden');
                const modalContainer = DOM.postModal.querySelector(
                    '.post-form-container-modal',
                );
                modalContainer.innerHTML =
                    createPostFormHTML(true) +
                    `<div id="quoting-preview-container"></div>`;
                attachPostFormListeners(modalContainer);
                modalContainer.querySelector('textarea').textContent =
                    '#' + query;

                DOM.postModal.querySelector('.modal-close-btn').onclick =
                    closePostModal;
                modalContainer.querySelector('textarea').focus();
            });
            postContainer.appendChild(tagPostButton);
        }

        userResultsContainer.innerHTML = '<div class="spinner"></div>';
        // 検索フィルターのベース
        const filters = [
            `name.ilike.%${query}%`,
            `scid.ilike.%${query}%`,
            `me.ilike.%${query}%`,
        ];
        // query が数値の場合のみ id 条件を追加
        if (!isNaN(Number(query))) {
            filters.unshift(`id.eq.${query}`);
        }
        const { data: users, error: userError } = await supabase
            .from('user')
            .select('id, name, scid, me, icon_data, settings')
            .or(filters.join(','))
            .order('id', { ascending: true })
            .limit(10);
        if (userError) console.error('ユーザー検索エラー:', userError);
        const userTitle = document.createElement('h3');
        userTitle.style.padding = '1rem';
        userTitle.textContent = `ユーザー (0件)`
        userResultsContainer.innerHTML = '';
        userResultsContainer.appendChild(userTitle)
        //userResultsContainer.innerHTML = `<h3 style="padding:1rem;">ユーザー (${users?.length || 0}件)</h3>`;
        if (users && users.length > 0) {
            let user_count = 0
            users.forEach((u) => {
                if (query.toUpperCase() != u.scid.toUpperCase()){
                    if (u.scid.toUpperCase().includes(query.toUpperCase()) == false || u.settings.show_scid){
                        user_count++;
                        const userCard = document.createElement('div');
                        userCard.className = 'profile-card widget-item';
                        const userLink = document.createElement('a');
                        userLink.href = `#profile/${u.id}`;
                        userLink.className = 'profile-link';
                        userLink.style.cssText =
                            'display:flex; align-items:center; gap:0.8rem; text-decoration:none; color:inherit;';
                        userLink.innerHTML = `<img src="${getUserIconUrl(u)}" style="width:48px; height:48px; border-radius:50%;" alt="${escapeHTML(u.name)}'s icon"><div><span class="name" style="font-weight:700;">${getEmoji(escapeHTML(u.name))}</span><span class="id" style="color:var(--secondary-text-color);">#${u.id}</span><p class="me" style="margin:0.2rem 0 0;">${getEmoji(escapeHTML(u.me || ''))}</p></div>`;
                        userCard.appendChild(userLink);
                        userResultsContainer.appendChild(userCard);
                    }
                }
            });
            userTitle.textContent = `ユーザー (${user_count || 0}件)`
            if (user_count == 0) {
                userResultsContainer.innerHTML += `<p style="padding:1rem; text-align:center;">ユーザーは見つかりませんでした。</p>`;
            }
        } else {
            userResultsContainer.innerHTML += `<p style="padding:1rem; text-align:center;">ユーザーは見つかりませんでした。</p>`;
        }

        postResultsContainer.innerHTML = `<h3 style="padding:1rem; border-top:1px solid var(--border-color); margin-top:1rem; padding-top:1rem;">ポスト</h3>`;
        await loadPostsWithPagination(postResultsContainer, 'search', {
            query,
        });
        showLoading(false);
    }

    async function showNotificationsScreen() {
        if (!currentUser) {
            DOM.pageHeader.innerHTML = `<h2 id="page-title">通知</h2>`;
            showScreen('notifications-screen');
            DOM.notificationsContent.innerHTML =
                '<p style="padding: 2rem; text-align:center; color: var(--secondary-text-color);">通知を見るにはログインが必要です。</p>';
            showLoading(false);
            return;
        }

        DOM.pageHeader.innerHTML = `
            <div class="header-with-action-button">
                <h2 id="page-title">通知</h2>
                <button id="mark-all-read-btn" class="header-action-btn">すべて既読</button>
            </div>`;

        showScreen('notifications-screen');
        const contentDiv = DOM.notificationsContent;
        contentDiv.innerHTML = '<div class="spinner"></div>';

        document
            .getElementById('mark-all-read-btn')
            .addEventListener('click', async () => {
                if (!confirm('すべての通知を既読にしますか？')) return;

                showLoading(true);
                try {
                    const { error } = await supabase.rpc(
                        'mark_all_notifications_as_read',
                        {
                            p_user_id: currentUser.id,
                        },
                    );
                    if (error) throw error;

                    if (currentUser.notice) {
                        currentUser.notice.forEach((n) => (n.click = true));
                    }
                    currentUser.notice_count = 0;
                    await showNotificationsScreen();
                    await updateNavAndSidebars();
                } catch (e) {
                    console.error('すべて既読処理でエラー:', e);
                    alert('処理中にエラーが発生しました。');
                } finally {
                    showLoading(false);
                }
            });

        try {
            if (currentUser.notice_count > 0) {
                const previousCount = currentUser.notice_count;
                currentUser.notice_count = 0; // UIを即時更新
                updateNavAndSidebars();

                // DBへの更新はバックグラウンドで実行
                supabase
                    .from('user')
                    .update({ notice_count: 0 })
                    .eq('id', currentUser.id)
                    .then(({ error }) => {
                        if (error) {
                            // 失敗した場合はUIを元に戻す
                            console.error(
                                'Failed to reset notice_count:',
                                error,
                            );
                            currentUser.notice_count = previousCount;
                            updateNavAndSidebars();
                        }
                    });
            }

            contentDiv.innerHTML = '';

            const { data: latestUser, error } = await supabase
                .from('user')
                .select('notice')
                .eq('id', currentUser.id)
                .single();
            if (error) {
                const noticeEl = document.createElement('div');
                content.className = 'notification-item-content';
                content.innerHTML =
                    '[エラー] 通知の取得に失敗したため古い通知を表示しています。';
                noticeEl.appendChild(content);
                contentDiv.appendChild(noticeEl);
            } else {
                currentUser.notice = latestUser.notice;
            }
            await ensureMentionedUsersCached(
                (currentUser.notice || []).map((n) =>
                    typeof n === 'object' ? n.message : n,
                ),
            );

            if (currentUser.notice?.length) {
                currentUser.notice.forEach((n_obj) => {
                    const isObject =
                        typeof n_obj === 'object' && n_obj !== null;
                    const notification = isObject
                        ? n_obj
                        : {
                                id: crypto.randomUUID(),
                                message: n_obj,
                                open: '',
                                click: true,
                            };

                    const noticeEl = document.createElement('div');
                    noticeEl.className = 'widget-item notification-item';
                    if (!notification.click) {
                        noticeEl.classList.add('notification-new');
                    }
                    noticeEl.dataset.notificationId = notification.id;

                    const content = document.createElement('div');
                    content.className = 'notification-item-content';
                    content.innerHTML = formatPostContent(
                        notification.message,
                        allUsersCache,
                    );

                    const deleteBtn = document.createElement('button');
                    deleteBtn.className = 'notification-delete-btn';
                    deleteBtn.innerHTML = '×';
                    deleteBtn.title = '通知を削除';

                    noticeEl.appendChild(content);
                    noticeEl.appendChild(deleteBtn);
                    contentDiv.appendChild(noticeEl);
                });
            } else {
                contentDiv.innerHTML =
                    '<p style="padding: 2rem; text-align:center; color: var(--secondary-text-color);">通知はまだありません。</p>';
            }
        } catch (e) {
            console.error('通知画面エラー:', e);
            contentDiv.innerHTML = `<p class="error-message">通知の読み込みに失敗しました。</p>`;
        } finally {
            showLoading(false);
        }
    }

    async function showLikesScreen() {
        DOM.pageHeader.innerHTML = `<h2 id="page-title">いいね</h2>`;
        showScreen('likes-screen');
        DOM.likesContent.innerHTML = '';
        await loadPostsWithPagination(DOM.likesContent, 'likes', {
            ids: currentUser.like,
        });
        showLoading(false);
    }
    async function showStarsScreen() {
        DOM.pageHeader.innerHTML = `<h2 id="page-title">お気に入り</h2>`;
        showScreen('stars-screen');
        DOM.starsContent.innerHTML = '';
        await loadPostsWithPagination(DOM.starsContent, 'stars', {
            ids: currentUser.star,
        });
        showLoading(false);
    }

    async function showPostDetail(postId) {
        DOM.pageHeader.innerHTML = `
            <div class="header-with-back-button">
                <button class="header-back-btn" onclick="window.history.back()">${ICONS.back}</button>
                <h2 id="page-title">ポスト</h2>
            </div>`;
        showScreen('post-detail-screen');
        const contentDiv = DOM.postDetailContent;
        contentDiv.innerHTML = '<div class="spinner"></div>';

        try {
            const { data: gatePost, error: gateError } = await supabase
                .from('post')
                .select('content, repost_to')
                .eq('id', postId)
                .single();

            if (gateError || !gatePost)
                throw new Error('ポストが見つかりません。');

            if (gatePost.repost_to && !gatePost.content) {
                window.location.replace(`#post/${gatePost.repost_to}`);
                return;
            }

            const { data: mainPost, error: postError } = await supabase
                .rpc('get_hydrated_posts', {
                    p_post_ids: [postId],
                    p_profile: true,
                })
                .single();
            if (postError || !mainPost)
                throw postError || new Error('ポストの取得に失敗しました。');

            const { data: allRepliesRaw, error: repliesError } =
                await supabase.rpc('get_all_replies', { root_post_id: postId });
            if (repliesError) throw repliesError;

            const allPostIdsOnPage = new Set([
                mainPost.id,
                ...allRepliesRaw.map((r) => r.id),
            ]);
            if (mainPost.reposted_post)
                allPostIdsOnPage.add(mainPost.reposted_post.id);
            if (mainPost.reply_to_post)
                allPostIdsOnPage.add(mainPost.reply_to_post.id);

            const postIdsArray = Array.from(allPostIdsOnPage);

            let metrics, metricsMap;

            const metricsPromise = (async () => {
                const { data: metricsData, error } = await supabase.rpc(
                    'get_post_metrics',
                    { post_ids: postIdsArray },
                );
                if (error || !metricsData) return;
                metricsMap = new Map(metricsData.map((c) => [c.post_id, c]));

                if (mainPost.reply_to_post) {
                    metrics = metricsMap.get(mainPost.reply_to_post.id);
                    mainPost.reply_to_post.reply_count = metrics.reply_count;
                    mainPost.reply_to_post.like_count = metrics.like_count;
                    mainPost.reply_to_post.star_count = metrics.star_count;
                    mainPost.reply_to_post.repost_count = metrics.repost_count;
                }
                if (mainPost.reposted_post) {
                    metrics = metricsMap.get(mainPost.reposted_post.id);
                    mainPost.reposted_post.reply_count = metrics.reply_count;
                    mainPost.reposted_post.like_count = metrics.like_count;
                    mainPost.reposted_post.star_count = metrics.star_count;
                    mainPost.reposted_post.repost_count = metrics.repost_count;
                }
                metrics = metricsMap.get(mainPost.id);
                mainPost.reply_count = metrics.reply_count;
                mainPost.like_count = metrics.like_count;
                mainPost.star_count = metrics.star_count;
                mainPost.repost_count = metrics.repost_count;
            })();

            contentDiv.innerHTML = '';

            if (mainPost.reply_to_post) {
                const parentPostEl = await renderPost(
                    mainPost.reply_to_post,
                    mainPost.reply_to_post.author,
                    { userCache: allUsersCache, metricsPromise },
                );
                if (parentPostEl) {
                    const parentContainer = document.createElement('div');
                    parentContainer.className = 'parent-post-container';
                    parentContainer.appendChild(parentPostEl);
                    contentDiv.appendChild(parentContainer);
                }
            }

            const mainPostEl = await renderPost(mainPost, mainPost.author, {
                userCache: allUsersCache,
                metricsPromise,
            });
            if (mainPostEl) contentDiv.appendChild(mainPostEl);

            const repliesHeader = document.createElement('h3');
            repliesHeader.textContent = '返信';
            repliesHeader.style.cssText =
                'padding: 1rem; border-top: 1px solid var(--border-color); border-bottom: 1px solid var(--border-color); margin-top: 1rem; margin-bottom: 0; font-size: 1.2rem;';
            contentDiv.appendChild(repliesHeader);

            const repliesByParentId = new Map();
            allRepliesRaw.forEach((reply) => {
                const parentId = reply.reply_id;
                if (!repliesByParentId.has(parentId)) {
                    repliesByParentId.set(parentId, []);
                }
                repliesByParentId.get(parentId).push(reply);
            });
            // 各親ID内の返信を時間順にソート
            for (const replies of repliesByParentId.values()) {
                replies.sort((a, b) => new Date(a.time) - new Date(b.time));
            }

            const flatReplyList = [];
            const buildFlatList = (parentId) => {
                const children = repliesByParentId.get(parentId) || [];
                for (const child of children) {
                    flatReplyList.push(child);
                    buildFlatList(child.id); // 再帰的に孫以降を探す
                }
            };
            buildFlatList(postId); // メインポストを起点にツリーを平坦化

            const repliesContainer = document.createElement('div');
            contentDiv.appendChild(repliesContainer);
            const trigger = document.createElement('div');
            trigger.className = 'load-more-trigger';
            contentDiv.appendChild(trigger);

            let pagination = { page: 0, hasMore: flatReplyList.length > 0 };
            const REPLIES_PER_PAGE = 10;
            let isLoadingReplies = false;

            const loadMoreReplies = async () => {
                if (isLoadingReplies || !pagination.hasMore) return;
                isLoadingReplies = true;
                trigger.innerHTML = '<div class="spinner"></div>';

                const from = pagination.page * REPLIES_PER_PAGE;
                const to = from + REPLIES_PER_PAGE;
                const repliesToRender = flatReplyList.slice(from, to);

                // キャッシュ
                getUserTrustRank(
                    repliesToRender.map((r) => r.author_id),
                    false,
                );

                for (const reply of repliesToRender) {
                    const postForRender = {
                        ...reply,
                    };

                    const reply_metrics_promise = (async () => {
                        await metricsPromise;
                        metrics = metricsMap.get(reply.id);
                        postForRender.reply_count = metrics.reply_count;
                        postForRender.like_count = metrics.like_count;
                        postForRender.star_count = metrics.star_count;
                        postForRender.repost_count = metrics.repost_count;
                    })();

                    const authorForRender = {
                        id: reply.author_id,
                        name: reply.author_name,
                        scid: reply.author_scid,
                        icon_data: reply.author_icon_data,
                        admin: reply.author_admin,
                        verify: reply.author_verify,
                    };

                    if (reply.reply_id !== postId && reply.reply_to_user_id) {
                        postForRender.reply_to = {
                            user: {
                                id: reply.reply_to_user_id,
                                name: reply.reply_to_user_name,
                            },
                        };
                    }

                    const isDirectReply = reply.reply_id === postId;

                    const postEl = await renderPost(
                        postForRender,
                        authorForRender,
                        {
                            userCache: allUsersCache,
                            isDirectReply,
                            metricsPromise,
                        },
                    );

                    if (postEl) {
                        if (reply.reply_id !== postId) {
                            postEl.classList.add('grandchild-reply');
                        }
                        repliesContainer.appendChild(postEl);
                    }

                    if (POST_COUNT >= AdPOST_PER_POSTS) {
                        POST_COUNT = 0;
                        const adPostEl = createAdPostHTML();
                        if (adPostEl) repliesContainer.appendChild(adPostEl);
                    }
                }

                pagination.page++;
                if (
                    pagination.page * REPLIES_PER_PAGE >=
                    allRepliesRaw.length
                ) {
                    pagination.hasMore = false;
                }

                if (!pagination.hasMore) {
                    trigger.textContent = repliesContainer.hasChildNodes()
                        ? 'すべての返信を読み込みました'
                        : 'まだ返信はありません。';
                    if (postLoadObserver) postLoadObserver.disconnect();
                } else {
                    trigger.innerHTML = '';
                }
                isLoadingReplies = false;
            };

            const postLoadObserver = new IntersectionObserver(
                (entries) => {
                    if (entries[0].isIntersecting) {
                        loadMoreReplies();
                    }
                },
                { rootMargin: '200px' },
            );

            postLoadObserver.observe(trigger);
        } catch (err) {
            console.error('Post detail error:', err);
            contentDiv.innerHTML = `<p class="error-message">${err.message || 'ページの読み込みに失敗しました。'}</p>`;
        } finally {
            showLoading(false);
        }
    }

    async function showDmScreen(dmId = null) {
        if (!currentUser) return router();
        showScreen('dm-screen');
        const contentDiv = DOM.dmContent;

        if (dmId) {
            // --- 会話画面の表示 ---
            DOM.pageHeader.innerHTML = '';
            contentDiv.innerHTML = '<div id="dm-conversation-container"></div>';
            await showDmConversation(dmId);
        } else {
            // --- リスト画面の表示 ---
            DOM.pageHeader.innerHTML = `<h2 id="page-title">メッセージ</h2>`;

            contentDiv.innerHTML = `
                <div id="dm-list-container">
                    <button class="dm-new-message-btn" onclick="window.openCreateDmModal()">新しいメッセージ</button>
                    <div id="dm-list-items-wrapper" class="spinner"></div>
                </div>
            `;
            const listItemsWrapper = document.getElementById(
                'dm-list-items-wrapper',
            );

            try {
                const { data: dms, error } = await supabase
                    .from('dm')
                    .select('id, title, member, time')
                    .contains('member', [currentUser.id])
                    .order('time', { ascending: false });
                if (error) throw error;

                const { data: unreadCountsData, error: unreadError } =
                    await supabase.rpc('get_all_unread_dm_counts', {
                        p_user_id: currentUser.id,
                    });
                if (unreadError) throw unreadError;
                const unreadCountsMap = new Map(
                    unreadCountsData.map((item) => [
                        item.dm_id,
                        item.unread_count,
                    ]),
                );

                const allMemberIds = new Set(dms.flatMap((dm) => dm.member));
                const newIdsToFetch = [...allMemberIds].filter(
                    (id) => !allUsersCache.has(id),
                );
                if (newIdsToFetch.length > 0) {
                    const { data: newUsers } = await supabase
                        .from('user')
                        .select('id, name, scid, icon_data, block')
                        .in('id', newIdsToFetch);
                    if (newUsers)
                        newUsers.forEach((u) => allUsersCache.set(u.id, u));
                }

                if (window.location.hash.startsWith('#dm/')) {
                    window.history.replaceState({ path: '#dm' }, '', '#dm');
                }

                if (dms.length === 0) {
                    listItemsWrapper.innerHTML =
                        '<p style="text-align:center; padding: 2rem; color: var(--secondary-text-color);">まだメッセージはありません。</p>';
                } else {
                    listItemsWrapper.innerHTML = dms
                        .map((dm) => {
                            const unreadCount = unreadCountsMap.get(dm.id) || 0;
                            const titlePrefix =
                                unreadCount > 0 ? `(${unreadCount}) ` : '';
                            const title = getEmoji(
                                escapeHTML(
                                    dm.title ||
                                        dm.member
                                            .map(
                                                (id) =>
                                                    allUsersCache.get(id)
                                                        ?.name || id,
                                            )
                                            .join(', '),
                                ),
                            );

                            return `
                            <div class="dm-list-item" onclick="window.location.hash='#dm/${dm.id}'">
                                <div class="dm-list-item-title">${titlePrefix}${title}</div>
                                <button class="dm-manage-btn" onclick="event.stopPropagation(); window.openDmManageModal('${dm.id}')">…</button>
                            </div>
                        `;
                        })
                        .join('');
                }

                listItemsWrapper.classList.remove('spinner');
            } catch (e) {
                console.error('DMリストの読み込みに失敗:', e);
                listItemsWrapper.innerHTML =
                    '<p class="error-message">メッセージの読み込みに失敗しました。</p>';
                listItemsWrapper.classList.remove('spinner');
            } finally {
                showLoading(false);
            }
        }
    }
    async function showDmConversation(dmId) {
        const container = document.getElementById('dm-conversation-container');
        container.innerHTML = '<div class="spinner"></div>';

        let dmSelectedFiles = [];

        try {
            const { data: dm, error } = await supabase
                .from('dm')
                .select('id, title, post, member, host_id')
                .eq('id', dmId)
                .single();
            if (error || !dm || !dm.member.includes(currentUser.id)) {
                DOM.pageHeader.innerHTML = `
                    <div class="header-with-back-button">
                        <button class="header-back-btn" onclick="window.history.back()">${ICONS.back}</button>
                        <h2 id="page-title">エラー</h2>
                    </div>`;
                container.innerHTML =
                    '<p class="error-message" style="margin:2rem;">DMが見つからないか、アクセス権がありません。</p>';
                showLoading(false);
                return;
            }

            DOM.pageHeader.innerHTML = `
                <div class="header-with-back-button">
                    <button class="header-back-btn" onclick="window.history.back()">${ICONS.back}</button>
                    <div style="flex-grow:1;">
                        <h2 id="page-title" style="font-size: 1.1rem; margin-bottom: 0;">${getEmoji(escapeHTML(dm.title))}</h2>
                        <small style="color: var(--secondary-text-color);">${dm.member.length}人のメンバー</small>
                    </div>
                    <button class="dm-manage-btn" style="font-size: 1.2rem;" onclick="window.openDmManageModal('${dm.id}')">…</button>
                </div>
            `;

            let posts = dm.post || [];
            posts = filterBlockedPosts(posts);
            const allUserIdsInDm = new Set(dm.member);

            posts.forEach((msg) => {
                if (msg.userid) allUserIdsInDm.add(msg.userid);
                if (msg.content) {
                    for (const match of msg.content.matchAll(/@(\d+)/g)) {
                        allUserIdsInDm.add(parseInt(match[1]));
                    }
                }
            });

            const newIdsToFetch = [...allUserIdsInDm].filter(
                (id) => id && !allUsersCache.has(id),
            );
            if (newIdsToFetch.length > 0) {
                const { data: users } = await supabase
                    .from('user')
                    .select('id, name, scid, icon_data, block')
                    .in('id', newIdsToFetch);
                if (users) {
                    users.forEach((u) => allUsersCache.set(u.id, u));
                }
            }

            const messagesHTMLArray = await Promise.all(
                posts
                    .slice()
                    .reverse()
                    .map((msg) => renderDmMessage(msg)),
            );
            const messagesHTML = messagesHTMLArray.join('');

            container.innerHTML = `
                <div class="dm-conversation-view">${messagesHTML}</div>
                <div class="dm-message-form">
                    <div class="dm-form-content">
                        <textarea id="dm-message-input" placeholder="メッセージを送信"></textarea>
                        <div class="file-preview-container dm-file-preview"></div>
                    </div>
                    <div class="dm-form-actions">
                        <button id="dm-attachment-btn" class="attachment-button" title="ファイルを添付">${ICONS.attachment}</button>
                        <input type="file" id="dm-file-input" class="hidden" multiple>
                        <button id="send-dm-btn" title="送信 (Ctrl+Enter)">${ICONS.send}</button>
                    </div>
                </div>
            `;

            await supabase.rpc('mark_all_dm_messages_as_read', {
                p_dm_id: dmId,
                p_user_id: currentUser.id,
            });
            await updateNavAndSidebars();

            const messageInput = document.getElementById('dm-message-input');
            const fileInput = document.getElementById('dm-file-input');
            const previewContainer = container.querySelector(
                '.file-preview-container',
            );

            document.getElementById('dm-attachment-btn').onclick = () =>
                fileInput.click();

            fileInput.onchange = (event) => {
                dmSelectedFiles = Array.from(event.target.files);
                previewContainer.innerHTML = '';
                dmSelectedFiles.forEach((file, index) => {
                    const previewItem = document.createElement('div');
                    previewItem.className = 'file-preview-item';

                    if (file.type.startsWith('image/')) {
                        const reader = new FileReader();
                        reader.onload = (e) => {
                            previewItem.innerHTML = `<img src="${e.target.result}" alt="${escapeHTML(file.name)}"><button class="file-preview-remove" data-index="${index}">×</button>`;
                        };
                        reader.readAsDataURL(file);
                    } else if (file.type.startsWith('video/')) {
                        const reader = new FileReader();
                        reader.onload = (e) => {
                            previewItem.innerHTML = `<video src="${e.target.result}" style="width:100px; height:100px; object-fit:cover;" controls></video><button class="file-preview-remove" data-index="${index}">×</button>`;
                        };
                        reader.readAsDataURL(file);
                    } else if (file.type.startsWith('audio/')) {
                        const reader = new FileReader();
                        reader.onload = (e) => {
                            previewItem.innerHTML = `<div style="display:flex; align-items:center; gap:0.5rem;"><audio src="${e.target.result}" controls style="height: 30px; width: 200px;"></audio><button class="file-preview-remove" data-index="${index}" style="position:relative; top:0; right:0;">×</button></div>`;
                        };
                        reader.readAsDataURL(file);
                    } else {
                        previewItem.innerHTML = `<span>📄 ${escapeHTML(file.name)}</span><button class="file-preview-remove" data-index="${index}">×</button>`;
                    }

                    previewContainer.appendChild(previewItem);
                });
            };

            previewContainer.addEventListener('click', (e) => {
                if (e.target.classList.contains('file-preview-remove')) {
                    const indexToRemove = parseInt(e.target.dataset.index);
                    dmSelectedFiles.splice(indexToRemove, 1);
                    const newFiles = new DataTransfer();
                    dmSelectedFiles.forEach((file) => newFiles.items.add(file));
                    fileInput.files = newFiles.files;
                    fileInput.dispatchEvent(new Event('change'));
                }
            });

            const sendMessageAction = () => {
                sendDmMessage(dmId, dmSelectedFiles).then(() => {
                    dmSelectedFiles = [];
                    fileInput.value = '';
                    previewContainer.innerHTML = '';
                });
            };

            messageInput.addEventListener('keydown', (e) => {
                if (e.ctrlKey && e.key === 'Enter') {
                    e.preventDefault();
                    sendMessageAction();
                }
            });
            document.getElementById('send-dm-btn').onclick = sendMessageAction;

            lastRenderedMessageId =
                posts.length > 0 ? posts[posts.length - 1].id : null;

            if (currentDmChannel) supabase.removeChannel(currentDmChannel);
            currentDmChannel = supabase
                .channel(`dm-${dmId}`)
                .on(
                    'postgres_changes',
                    {
                        event: 'UPDATE',
                        schema: 'public',
                        table: 'dm',
                        filter: `id=eq.${dmId}`,
                    },
                    async (payload) => {
                        const newPostArray = payload.new.post;
                        if (!newPostArray || newPostArray.length === 0) return;

                        const latestMessage =
                            newPostArray[newPostArray.length - 1];
                        if (
                            latestMessage.id === lastRenderedMessageId ||
                            latestMessage.userid === currentUser.id
                        )
                            return;

                        await supabase.rpc('mark_all_dm_messages_as_read', {
                            p_dm_id: dmId,
                            p_user_id: currentUser.id,
                        });

                        if (currentUser.block.includes(latestMessage.userid))
                            return;

                        const view = document.querySelector(
                            '.dm-conversation-view',
                        );
                        if (view) {
                            const msgHTML =
                                await renderDmMessage(latestMessage);
                            view.insertAdjacentHTML('afterbegin', msgHTML);
                            lastRenderedMessageId = latestMessage.id;
                        }
                    },
                )
                .subscribe();
        } catch (e) {
            console.error('DM会話の読み込みに失敗:', e);
            container.innerHTML =
                '<p class="error-message">メッセージの読み込みに失敗しました。</p>';
        } finally {
            showLoading(false);
        }
    }

    async function showProfileScreen(userId, subpage = 'posts') {
        DOM.pageHeader.innerHTML = `
            <div class="header-with-back-button">
                <button class="header-back-btn" onclick="window.history.back()">${ICONS.back}</button>
                <h2 id="page-title">
                    <div id="page-title-main">プロフィール</div>
                    <small id="page-title-sub"></small>
                </h2>
            </div>`;
        showScreen('profile-screen');
        const profileHeader = document.getElementById('profile-header');
        const profileTabs = document.getElementById('profile-tabs');

        document.querySelector('.freeze-notice')?.remove();
        document.getElementById('profile-content').innerHTML = '';
        profileHeader.innerHTML = '<div class="spinner"></div>';
        profileTabs.innerHTML = '';

        try {
            const { data: user, error } = await supabase
                .from('user')
                .select('*')
                .eq('id', userId)
                .single();
            if (error || !user) {
                profileHeader.innerHTML = '<h2>ユーザーが見つかりません</h2>';
                showLoading(false);
                return;
            }
            const { data: is_lock, error: LockError } = await supabase.rpc(
                'is_lock',
                { target_user_id: userId },
            );
            user.lock = LockError ? false : is_lock;
            await ensureMentionedUsersCached([user.me]);

            if (user.frieze) {
                document.getElementById('page-title-main').innerHTML = getEmoji(
                    escapeHTML(user.name),
                );
                document.getElementById('page-title-sub').textContent =
                    `#${user.id}`;
                profileHeader.innerHTML = `
                    <div class="header-top">
                        <img src="${getUserIconUrl(user)}" class="user-icon-large" alt="${escapeHTML(user.name)}'s icon">
                    </div>
                    <div class="profile-info">
                        <h2>${getEmoji(escapeHTML(user.name))}</h2>
                        <div class="user-id">#${user.id}</div>
                    </div>`;
                const freezeNotice = document.createElement('div');
                freezeNotice.className = 'freeze-notice';
                freezeNotice.innerHTML = `このユーザーは<a href="rule" target="_blank" rel="noopener noreferrer">NyaXルール</a>に違反したため凍結されています。`;
                profileTabs.innerHTML = '';
                profileTabs.insertAdjacentElement('afterend', freezeNotice);

                showLoading(false);
                return;
            }

            // ブロック状態の通知
            let blockNoticeHtml = '';
            if (currentUser && currentUser.id !== user.id) {
                if (
                    Array.isArray(currentUser.block) &&
                    currentUser.block.includes(user.id)
                ) {
                    blockNoticeHtml += `<div class="freeze-notice">あなたはこのユーザーをブロックしています。ポスト/メッセージは表示されません。</div>`;
                }
                if (
                    Array.isArray(user.block) &&
                    user.block.includes(currentUser.id)
                ) {
                    blockNoticeHtml += `<div class="freeze-notice">このユーザーはあなたをブロックしています。ポスト/メッセージは表示されません。</div>`;
                }
                if (user.lock) {
                    blockNoticeHtml += `<div class="freeze-notice">このユーザーはポストを非公開に設定しています。表示するにはフォローリクエストを送信してください。</div>`;
                }
            } else if (!currentUser) {
                if (user.lock) {
                    blockNoticeHtml += `<div class="freeze-notice">このユーザーはポストを非公開に設定しています。</div>`;
                }
            }
            if (blockNoticeHtml) {
                // 通知を生成
                document
                    .querySelectorAll('.freeze-notice')
                    .forEach((el) => el.remove());
                profileTabs.insertAdjacentHTML('afterend', blockNoticeHtml);
            }

            // 諸々の取得
            if (currentUser?.admin) {
                const { data: status, error: statusError } = await supabase
                    .rpc('get_status', { p_id: userId })
                    .single();
                user.shadow = statusError ? false : status.shadow;
                user.trust = statusError ? false : status.trust;
            }

            const { data: postCount, error: postCountError } =
                await supabase.rpc('get_user_post_count', {
                    p_user_id: userId,
                });
            user.postCount = postCountError ? 0 : postCount;

            const { data: mediaCount, error: mediaCountError } =
                await supabase.rpc('get_user_media_count', {
                    p_user_id: userId,
                });
            user.mediaCount = mediaCountError ? 0 : mediaCount;

            const { data: followerCountData, error: countError } =
                await supabase.rpc('get_follower_count', {
                    target_user_id: userId,
                });
            const followerCount = countError ? '?' : followerCountData;
            const userMeHtml = formatPostContent(user.me || '', allUsersCache);

            profileHeader.innerHTML = `
                <div class="header-top">
                    <img src="${getUserIconUrl(user)}" class="user-icon-large" alt="${escapeHTML(user.name)}'s icon">
                    <div id="profile-actions" class="profile-actions"></div>
                </div>
                <div class="profile-info">
                    <h2>
                        ${getEmoji(escapeHTML(user.name))}
                        ${user.admin ? `<img src="icons/admin.png" class="admin-badge" title="NyaXTeam">` : (await contributors).includes(user.id) ? `<img src="icons/contributor.png" class="contributor-badge" title="開発協力者">` : user.verify ? `<img src="icons/verify.png" class="verify-badge" title="認証済み">` : ''}
                        ${await MakeTrustLabel(user.id)}
                    </h2>
                    <div class="user-id">#${user.id} ${user.settings.show_scid ? `(<a href="https://scratch.mit.edu/users/${user.scid}" class="scidlink" target="_blank" rel="noopener noreferrer">@${user.scid}</a>)` : ''}</div>
                    <p class="user-me">${userMeHtml}</p>
                    <div class="profile-joined" aria-label="アカウント作成日">
                    <svg class="calendar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" focusable="false">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="16" y1="2" x2="16" y2="6"></line>
                        <line x1="8" y1="2" x2="8" y2="6"></line>
                        <line x1="3" y1="10" x2="21" y2="10"></line>
                    </svg>
                    <span class="profile-joined-text">${(() => {
                        const d = new Date(user.time);
                        const jst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
                        const year = jst.getFullYear();
                        const month = jst.getMonth() + 1;
                        const day = jst.getDate();
                        return `${year}年${month}月${day}日よりNyaXを利用しています`;
                    })()}</span>
                    </div>
                    <div class="user-stats">
                        <a href="#profile/${user.id}/following"><strong>${user.follow?.length || 0}</strong> フォロー中</a>
                        <a href="#profile/${user.id}/followers" id="follower-count"><strong>${followerCount}</strong> フォロワー</a>
                    </div>
                </div>`;

            if (currentUser && userId !== currentUser.id) {
                const actionsContainer =
                    profileHeader.querySelector('#profile-actions');
                if (actionsContainer) {
                    // DMボタン
                    const dmButton = document.createElement('button');
                    dmButton.className = 'dm-button';
                    dmButton.title = 'メッセージを送信';
                    dmButton.innerHTML = ICONS.dm;
                    dmButton.onclick = () => handleDmButtonClick(userId);
                    actionsContainer.appendChild(dmButton);

                    // フォローボタン
                    const followButton = document.createElement('button');
                    const isFollowing = currentUser.follow?.includes(userId);
                    updateFollowButtonState(
                        followButton,
                        isFollowing,
                        user.lock,
                    );
                    followButton.classList.add('profile-follow-button');
                    followButton.onclick = () =>
                        window.handleFollowToggle(
                            userId,
                            followButton,
                            user.lock,
                        );
                    actionsContainer.appendChild(followButton);

                    const menuButton = document.createElement('button');
                    menuButton.className = 'profile-menu-button dm-button'; // dm-buttonのスタイルを流用
                    menuButton.innerHTML = '…';
                    menuButton.onclick = (e) => {
                        e.stopPropagation();
                        openProfileMenu(user);
                    };
                    actionsContainer.appendChild(menuButton);
                }
            }

            const mainTabs = [
                { key: 'posts', name: 'ポスト' },
                { key: 'replies', name: '返信', className: 'mobile-hidden' },
                { key: 'media', name: 'メディア' },
                { key: 'likes', name: 'いいね' },
                { key: 'stars', name: 'お気に入り' },
            ];

            profileTabs.innerHTML = mainTabs
                .map(
                    (tab) =>
                        `<button class="tab-button ${tab.className || ''} ${tab.key === subpage ? 'active' : ''}" data-tab="${tab.key}">${tab.name}</button>`,
                )
                .join('');

            profileTabs.querySelectorAll('.tab-button').forEach((button) => {
                button.onclick = (e) => {
                    e.stopPropagation();
                    loadProfileTabContent(user, button.dataset.tab);
                };
            });

            await loadProfileTabContent(user, subpage);
        } catch (err) {
            profileHeader.innerHTML =
                '<h2>プロフィールの読み込みに失敗しました</h2>';
            console.error(err);
        } finally {
            showLoading(false);
        }
    }

    async function loadProfileTabContent(user, subpage) {
        const profileHeader = document.getElementById('profile-header');
        const profileTabs = document.getElementById('profile-tabs');
        const contentDiv = document.getElementById('profile-content');

        isLoadingMore = false;
        if (postLoadObserver) postLoadObserver.disconnect();
        contentDiv.innerHTML = '';

        const isFollowListActive =
            subpage === 'following' || subpage === 'followers';

        profileHeader.classList.toggle('hidden', isFollowListActive);
        profileTabs.classList.toggle('hidden', isFollowListActive);

        const pageTitleMain = document.getElementById('page-title-main');
        const pageTitleSub = document.getElementById('page-title-sub');
        pageTitleMain.innerHTML = getEmoji(escapeHTML(user.name));
        if (isFollowListActive) {
            pageTitleSub.textContent = `#${user.id}`;
        } else if (subpage === 'media') {
            pageTitleSub.textContent = `${user.mediaCount || 0} 件の画像と動画`;
        } else {
            pageTitleSub.textContent = `${user.postCount || 0} 件のポスト`;
        }

        const existingSubTabs = document.getElementById(
            'profile-sub-tabs-container',
        );
        if (existingSubTabs) existingSubTabs.remove();

        if (isFollowListActive) {
            const subTabsContainer = document.createElement('div');
            subTabsContainer.id = 'profile-sub-tabs-container';
            subTabsContainer.innerHTML = `
                <div class="profile-sub-tabs">
                    <button class="tab-button ${subpage === 'following' ? 'active' : ''}" data-sub-tab="following">フォロー中</button>
                    <button class="tab-button ${subpage === 'followers' ? 'active' : ''}" data-sub-tab="followers">フォロワー</button>
                </div>`;

            DOM.pageHeader.parentNode.insertBefore(
                subTabsContainer,
                DOM.pageHeader.nextSibling,
            );
            const headerHeight = DOM.pageHeader.offsetHeight;
            subTabsContainer.style.top = `${headerHeight}px`;

            subTabsContainer
                .querySelectorAll('.tab-button')
                .forEach((button) => {
                    button.onclick = (e) => {
                        e.stopPropagation();
                        loadProfileTabContent(user, button.dataset.subTab);
                    };
                });
        } else {
            document
                .querySelectorAll('#profile-tabs .tab-button')
                .forEach((btn) =>
                    btn.classList.toggle('active', btn.dataset.tab === subpage),
                );
        }

        let newUrl =
            subpage === 'posts'
                ? `#profile/${user.id}`
                : `#profile/${user.id}/${subpage}`;
        if (window.location.hash !== newUrl) {
            window.history.pushState({ path: newUrl }, '', newUrl);
        }

        try {
            switch (subpage) {
                case 'posts':
                    await loadPostsWithPagination(contentDiv, 'profile_posts', {
                        userId: user.id,
                        subType: 'posts_only',
                        pinId: user.pin,
                    });
                    break;
                case 'replies':
                    await loadPostsWithPagination(contentDiv, 'profile_posts', {
                        userId: user.id,
                        subType: 'replies_only',
                    });
                    break;
                case 'likes':
                    if (
                        !user.settings.show_like &&
                        (!currentUser || user.id !== currentUser.id)
                    ) {
                        contentDiv.innerHTML =
                            '<p style="padding: 2rem; text-align:center;">🔒 このユーザーのいいねは非公開です。</p>';
                        break;
                    }
                    await loadPostsWithPagination(contentDiv, 'likes', {
                        ids: user.like || [],
                    });
                    break;
                case 'stars':
                    if (
                        !user.settings.show_star &&
                        (!currentUser || user.id !== currentUser.id)
                    ) {
                        contentDiv.innerHTML =
                            '<p style="padding: 2rem; text-align:center;">🔒 このユーザーのお気に入りは非公開です。</p>';
                        break;
                    }
                    await loadPostsWithPagination(contentDiv, 'stars', {
                        ids: user.star || [],
                    });
                    break;
                case 'following':
                    if (
                        !user.settings.show_follow &&
                        (!currentUser || user.id !== currentUser.id)
                    ) {
                        contentDiv.innerHTML =
                            '<p style="padding: 2rem; text-align:center;">🔒 このユーザーのフォローリストは非公開です。</p>';
                        break;
                    }
                    await loadUsersWithPagination(contentDiv, 'follows', {
                        ids: user.follow || [],
                    });
                    break;
                case 'followers':
                    if (
                        !user.settings.show_follower &&
                        (!currentUser || user.id !== currentUser.id)
                    ) {
                        contentDiv.innerHTML =
                            '<p style="padding: 2rem; text-align:center;">🔒 このユーザーのフォロワーリストは非公開です。</p>';
                        break;
                    }
                    await loadUsersWithPagination(contentDiv, 'followers', {
                        userId: user.id,
                    });
                    break;
                case 'media':
                    await loadMediaGrid(contentDiv, { userId: user.id });
                    break;
            }
        } catch (err) {
            contentDiv.innerHTML = `<p class="error-message">コンテンツの読み込みに失敗しました。</p>`;
            console.error('loadProfileTabContent error:', err);
        }
    }

    async function showSettingsScreen() {
        if (!currentUser) return router();
        DOM.pageHeader.innerHTML = `<h2 id="page-title">設定</h2>`;
        showScreen('settings-screen');
        newIconDataUrl = null;
        resetIconToDefault = false;

        document.getElementById('settings-screen').innerHTML = `
            <form id="settings-form">
                <label for="setting-username">ユーザー名:</label>
                <input type="text" id="setting-username" required value="${escapeHTML(currentUser.name)}">
                
                <label for="setting-icon-input">アイコン:</label>
                <div class="setting-icon-container">
                    <img id="setting-icon-preview" src="${getUserIconUrl(currentUser)}" alt="icon preview" title="クリックしてファイルを選択">
                    <button type="button" id="reset-icon-btn">デフォルトに戻す</button>
                </div>
                <input type="file" id="setting-icon-input" accept="image/*" class="hidden">

                <label for="setting-me">自己紹介:</label>
                <textarea id="setting-me">${escapeHTML(currentUser.me || '')}</textarea>

                <label for="setting-default-timeline">ホーム画面のデフォルトタブ:</label>
                <select id="setting-default-timeline" style="width: 100%; padding: 0.8rem; border: 1px solid var(--border-color); border-radius: 8px; font-size: 1rem;">
                    <option value="all">すべて</option>
                    <option value="foryou">おすすめ</option>
                    <option value="following">フォロー中</option>
                </select>
                
                <fieldset><legend>公開設定</legend>
                    <input type="checkbox" id="setting-show-like" ${currentUser.settings.show_like ? 'checked' : ''}><label for="setting-show-like">いいねしたポストを公開する</label><br>
                    <input type="checkbox" id="setting-show-follow" ${currentUser.settings.show_follow ? 'checked' : ''}><label for="setting-show-follow">フォローしている人を公開する</label><br>
                    <input type="checkbox" id="setting-show-follower" ${(currentUser.settings.show_follower ?? true) ? 'checked' : ''}><label for="setting-show-follower">フォロワーリストを公開する</label><br>
                    <input type="checkbox" id="setting-show-star" ${currentUser.settings.show_star ? 'checked' : ''}><label for="setting-show-star">お気に入りを公開する</label><br>
                    <input type="checkbox" id="setting-show-scid" ${currentUser.settings.show_scid ? 'checked' : ''}><label for="setting-show-scid">Scratchアカウント名を公開する</label><br>
                    <input type="checkbox" id="setting-lock" ${currentUser.settings.lock ? 'checked' : ''}><label for="setting-lock">ポストを非公開にする(β)</label><br>
                </fieldset>

                <fieldset><legend>TrustRank(β)</legend>
                    <input type="checkbox" id="setting-show-tlabel" ${currentUser.settings.show_trust_label ? 'checked' : ''}><label for="setting-show-tlabel">ユーザーのTrustRankを表示</label><br>
                </fieldset>

                <label for"setting-emoji-kind">絵文字のフォント設定:</label>
                <select id="setting-emoji-kind" style="width: 100%; padding: 0.8rem; border: 1px solid var(--border-color); border-radius: 8px; font-size: 1rem;">
                    <option value="twemoji">Twemoji</option>
                    <option value="emojione">Emoji One</option>
                    <!--<option value="notocoloremoji">Noto Color Emoji</option>-->
                    <option value="default">デフォルト(端末絵文字)</option>
                </select>

                <label for="setting-theme">テーマ設定</label>
                <select id="setting-theme" style="width:100%; padding: 0.8rem; border: 1px solid var(--border-color); border-radius: 8px; font-size: 1rem;">
                    <option value="auto">端末設定</option>
                    <option value="light">ライト</option>
                    <option value="dark">ダーク</option>
                </select>
                
                <button type="submit">設定を保存</button>
            </form>
            <div class="settings-danger-zone" style="display: flex; gap: 0.5rem;">
                <!-- ボタンはJSで動的に挿入します -->
            </div>
            `;

        // settingsに値がない場合は 'all' をデフォルトとして扱う
        const currentDefaultTab =
            currentUser.settings?.default_timeline_tab || 'all';
        document.getElementById('setting-default-timeline').value =
            currentDefaultTab;

        const emoji_kind = currentUser.settings?.emoji || 'emojione';
        document.getElementById('setting-emoji-kind').value = emoji_kind;

        const theme = currentUser.settings?.theme || 'light';
        document.getElementById('setting-theme').value = theme;

        const dangerZone = document.querySelector('.settings-danger-zone');
        let dangerZoneHTML = `
            <button id="settings-account-switcher-btn">アカウント切替</button>
            <button id="settings-logout-btn">ログアウト</button>
        `;

        // 管理者の場合「アクセスログ」ボタンを追加
        if (currentUser.admin) {
            dangerZoneHTML += `
                <a href="#admin/logs" id="settings-showlog-btn">
                    アクセスログ
                </a>
            `;
        }
        dangerZone.innerHTML = dangerZoneHTML;

        const iconInput = document.getElementById('setting-icon-input');
        const iconPreview = document.getElementById('setting-icon-preview');

        iconPreview.addEventListener('click', () => iconInput.click());
        iconInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file || !file.type.startsWith('image/')) return;
            resetIconToDefault = false;
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    const MAX_DIMENSION = 300;
                    let { width, height } = img;
                    if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
                        if (width > height) {
                            height = Math.round(
                                (height * MAX_DIMENSION) / width,
                            );
                            width = MAX_DIMENSION;
                        } else {
                            width = Math.round(
                                (width * MAX_DIMENSION) / height,
                            );
                            height = MAX_DIMENSION;
                        }
                    }
                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    newIconDataUrl = canvas.toDataURL(file.type);
                    iconPreview.src = newIconDataUrl;
                };
                img.src = event.target.result;
            };
            reader.readAsDataURL(file);
        });

        document
            .getElementById('reset-icon-btn')
            .addEventListener('click', () => {
                resetIconToDefault = true;
                newIconDataUrl = null;
                iconInput.value = '';
                iconPreview.src = `https://trampoline.turbowarp.org/avatars/by-username/${currentUser.scid}`;
            });

        document
            .getElementById('settings-form')
            .addEventListener('submit', handleUpdateSettings);
        document
            .getElementById('settings-account-switcher-btn')
            .addEventListener('click', openAccountSwitcherModal);
        document
            .getElementById('settings-logout-btn')
            .addEventListener('click', (e) => {
                handleLogout();
            });

        showLoading(false);
    }

    async function showAdminLogsScreen() {
        DOM.pageHeader.innerHTML = `
            <div class="header-with-back-button">
                <button class="header-back-btn" onclick="window.history.back()">${ICONS.back}</button>
                <h2 id="page-title">アクセスログ</h2>
            </div>`;
        showScreen('admin-logs-screen');
        const contentDiv = document.getElementById('admin-logs-content');
        contentDiv.innerHTML = ''; // 表示前にクリア

        isLoadingMore = false;
        const LOGS_PER_PAGE = 30;
        let currentPage = 0;
        let hasMore = true;

        // 無限スクロールのトリガー要素
        const trigger = document.createElement('div');
        trigger.className = 'load-more-trigger';
        contentDiv.appendChild(trigger);

        const loadMoreLogs = async () => {
            if (isLoadingMore || !hasMore) return;
            isLoadingMore = true;
            trigger.innerHTML = '<div class="spinner"></div>';

            const offset = currentPage * LOGS_PER_PAGE;
            const { data, error } = await supabase.rpc(
                'get_logs_with_masked_ip',
                {
                    p_limit: LOGS_PER_PAGE,
                    p_offset: offset,
                },
            );

            if (error) {
                console.error('ログの取得に失敗:', error);
                trigger.innerHTML = `<p class="error-message">${escapeHTML(error.message)}</p>`;
                hasMore = false;
                isLoadingMore = false;
                return;
            }

            if (data && data.length > 0) {
                data.forEach((log) => {
                    const logItem = document.createElement('div');
                    logItem.className = 'widget-item'; // 通知と似たスタイルを流用
                    logItem.style.cssText =
                        'display: flex; flex-direction: column; gap: 0.25rem;';

                    logItem.innerHTML = `
                        <div>
                            <strong>SCID:</strong> ${escapeHTML(log.scratch_id)} (#${log.nyax_id})
                        </div>
                        <div style="font-size: 0.9rem; color: var(--secondary-text-color);">
                            ${new Date(log.log_time).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}
                        </div>
                        <div style="font-size: 0.8rem; color: var(--secondary-text-color); font-family: monospace; word-break: break-all;">
                            識別子: ${log.masked_ip_uuid}
                        </div>
                    `;
                    // トリガー要素の直前に新しいログアイテムを挿入
                    contentDiv.insertBefore(logItem, trigger);
                });
                currentPage++;
            }

            if (!data || data.length < LOGS_PER_PAGE) {
                hasMore = false;
                trigger.innerHTML =
                    contentDiv.children.length > 1
                        ? 'すべてのログを読み込みました'
                        : 'ログはまだありません。';
                if (postLoadObserver) postLoadObserver.disconnect();
            } else {
                trigger.innerHTML = '';
            }
            isLoadingMore = false;
        };

        // IntersectionObserverを設定して無限スクロールを実装
        postLoadObserver = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    loadMoreLogs();
                }
            },
            { rootMargin: '200px' },
        );

        postLoadObserver.observe(trigger);
        showLoading(false); // 初回のローディング表示を解除
    }

    async function loadPostsWithPagination(container, type, options = {}) {
        let localPostLoadObserver;
        currentPagination = { page: 0, hasMore: true, type, options };

        const trigger = document.createElement('div');
        trigger.className = 'load-more-trigger';
        container.appendChild(trigger);

        const loadMore = async () => {
            if (isLoadingMore || !currentPagination.hasMore) return;

            const currentTrigger =
                container.querySelector('.load-more-trigger');
            if (!currentTrigger) {
                if (localPostLoadObserver) localPostLoadObserver.disconnect();
                return;
            }

            isLoadingMore = true;
            currentTrigger.innerHTML = '<div class="spinner"></div>';

            let posterror = null;

            try {
                let posts = [];
                let hasMoreItems = true;
                let showPinPost = false;
                let doprofile = false;

                if (
                    (type === 'timeline' && options.tab === 'foryou') ||
                    type === 'search'
                ) {
                    // --- ケースA: SQL関数側でページネーションを行う ---
                    const rpcName =
                        type === 'search'
                            ? 'search_posts'
                            : 'get_recommended_posts';
                    const rpcParams =
                        type === 'search'
                            ? {
                                    query: options.query,
                                    page_size: POSTS_PER_PAGE,
                                    page_num: currentPagination.page,
                                }
                            : {
                                    p_user_id: currentUser?.id || null,
                                    page_size: POSTS_PER_PAGE,
                                    page_num: currentPagination.page,
                                };

                    const { data: rpcResult, error } = await supabase
                        .rpc(rpcName, rpcParams)
                        .single();
                    if (error) throw error;

                    posts = rpcResult.posts || [];
                    hasMoreItems = rpcResult.has_next || false;
                } else {
                    // --- ケースB: JS側でIDを取得し、ページネーションする ---
                    const from = currentPagination.page * POSTS_PER_PAGE;
                    const to = from + POSTS_PER_PAGE - 1;

                    let postIdsToFetch = [];
                    let idQuery;

                    if (type === 'timeline') {
                        idQuery = supabase.from('post_recent').select('id');
                        if (options.tab === 'following') {
                            if (currentUser?.follow?.length > 0) {
                                idQuery = idQuery.in(
                                    'userid',
                                    currentUser.follow,
                                );
                            } else {
                                hasMoreItems = false;
                            }
                        } else if (options.tab === 'announce') {
                            idQuery = supabase
                                .from('post')
                                .select('id')
                                .eq('userid', 2525)
                                .ilike('content', '%#NXAnnounce%')
                                .is('reply_id', null)
                                .order('time', { ascending: false });
                        }
                    } else if (type === 'profile_posts') {
                        doprofile = true;
                        if (!options.userId) {
                            hasMoreItems = false;
                        } else {
                            idQuery = supabase
                                .from('post_profile')
                                .select('id')
                                .eq('userid', options.userId);
                            if (options.subType === 'posts_only') {
                                idQuery = idQuery.is('reply_id', null);
                                if (
                                    options.pinId &&
                                    currentPagination.page === 0
                                ) {
                                    showPinPost = true;
                                }
                            } else if (options.subType === 'replies_only') {
                                idQuery = idQuery.not('reply_id', 'is', null);
                            }
                        }
                    } else if (type === 'likes' || type === 'stars') {
                        const idList = options.ids || [];
                        const reversedList = [...idList].reverse();
                        postIdsToFetch = reversedList.slice(from, to + 1);
                        if (postIdsToFetch.length < POSTS_PER_PAGE) {
                            hasMoreItems = false;
                        }
                    }

                    if (idQuery && hasMoreItems) {
                        const { data: idData, error: idError } =
                            await idQuery.range(from, to);
                        if (idError) throw idError;
                        postIdsToFetch = idData.map((p) => p.id);
                        if (
                            showPinPost &&
                            !postIdsToFetch.includes(options.pinId)
                        ) {
                            postIdsToFetch.push(options.pinId);
                        }
                        if (idData.length < POSTS_PER_PAGE) {
                            hasMoreItems = false;
                        }
                    }

                    if (postIdsToFetch.length > 0) {
                        const { data: hydratedPosts, error: hydratedError } =
                            await supabase.rpc('get_hydrated_posts', {
                                p_post_ids: postIdsToFetch,
                                p_profile: doprofile,
                            });
                        if (hydratedError) throw hydratedError;
                        const idOrderMap = new Map(
                            postIdsToFetch.map((id, index) => [id, index]),
                        );
                        posts = hydratedPosts.sort(
                            (a, b) =>
                                idOrderMap.get(a.id) - idOrderMap.get(b.id),
                        );
                    }
                }

                if (!container.querySelector('.load-more-trigger')) return;

                if (posts && posts.length > 0) {
                    posts = filterBlockedPosts(posts);

                    // 集計用ID（Repostは元投稿ID）
                    const postIdsForCounts = posts
                        .map((p) =>
                            p.repost_to && !p.content && p.reposted_post
                                ? p.reposted_post.id
                                : p.id,
                        )
                        .filter((id) => id);

                    const metricsPromise = (async () => {
                        // RPCで一括取得
                        const { data: metricsData, error } = await supabase.rpc(
                            'get_post_metrics',
                            { post_ids: postIdsForCounts },
                        );
                        if (error || !metricsData) return;
                        const metricsMap = new Map(
                            metricsData.map((c) => [c.post_id, c]),
                        );

                        for (const post of posts) {
                            const targetId =
                                post.repost_to &&
                                !post.content &&
                                post.reposted_post
                                    ? post.reposted_post.id
                                    : post.id;
                            const metrics = metricsMap.get(targetId) || {};

                            // like/star/repost は元投稿にセット
                            const targetPostForCounts =
                                post.repost_to &&
                                !post.content &&
                                post.reposted_post
                                    ? post.reposted_post
                                    : post;
                            if (targetPostForCounts) {
                                targetPostForCounts.like_count =
                                    metrics.like_count;
                                targetPostForCounts.star_count =
                                    metrics.star_count;
                                targetPostForCounts.reply_count =
                                    metrics.reply_count;
                                targetPostForCounts.repost_count =
                                    metrics.repost_count;
                            }
                        }
                    })().catch((error) => {
                        console.error(
                            'ポストメトリクスの読み込みに失敗:',
                            error,
                        );
                    });

                    // 全投稿のcontent内のメンションをキャッシュ
                    await ensureMentionedUsersCached(
                        posts.map((post) => post.content),
                    );

                    // 全投稿者のTrustRankをキャッシュ
                    await getUserTrustRank(
                        posts.map((post) => post.userid),
                        false,
                    );

                    if (showPinPost) {
                        const pinPost = posts.find(
                            (p) => p.id === options.pinId,
                        );
                        if (pinPost) {
                            const postEl = await renderPost(
                                pinPost,
                                pinPost.author,
                                {
                                    userCache: allUsersCache,
                                    metricsPromise,
                                    isPinned: true,
                                },
                            );
                            if (postEl) currentTrigger.before(postEl);
                        }
                    }
                    // 投稿レンダリング
                    for (const post of posts) {
                        if (showPinPost && post.id === options.pinId) continue; // ピン留めポストはすでに表示済みのためスキップ
                        const postEl = await renderPost(post, post.author, {
                            userCache: allUsersCache,
                            metricsPromise,
                        });
                        if (postEl) currentTrigger.before(postEl);
                        if (POST_COUNT >= AdPOST_PER_POSTS) {
                            POST_COUNT = 0;
                            const adPostEl = createAdPostHTML();
                            if (adPostEl) currentTrigger.before(adPostEl);
                        }
                    }
                }

                currentPagination.page++;
                currentPagination.hasMore = hasMoreItems;
            } catch (error) {
                posterror = error;
                console.error('ポストの読み込みに失敗:', error);
                currentTrigger.innerText = 'ポストの読み込みに失敗しました。';
                currentPagination.hasMore = false;
                if (localPostLoadObserver) localPostLoadObserver.disconnect();
            } finally {
                isLoadingMore = false;
                const finalTrigger =
                    container.querySelector('.load-more-trigger');
                if (!finalTrigger) return;

                if (!posterror) {
                    const emptyMessages = {
                        timeline: 'まだポストがありません。',
                        profile_posts: 'このユーザーはまだポストしていません。',
                        replies: 'まだ返信はありません。',
                        search: '該当するポストはありません。',
                        likes: 'いいねしたポストはありません。',
                        stars: 'お気に入りに登録したポストはありません。',
                    };
                    const emptyMessageKey =
                        options.subType === 'replies_only' ? 'replies' : type;

                    if (!currentPagination.hasMore) {
                        finalTrigger.innerText =
                            container.querySelectorAll('.post').length === 0
                                ? emptyMessages[emptyMessageKey] || ''
                                : 'すべてのポストを読み込みました';
                        if (localPostLoadObserver)
                            localPostLoadObserver.disconnect();
                    } else if (finalTrigger.innerHTML.includes('spinner')) {
                        finalTrigger.innerHTML = '';
                    }
                }
            }
        };

        localPostLoadObserver = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && !isLoadingMore) {
                    loadMore();
                }
            },
            { rootMargin: '200px' },
        );

        localPostLoadObserver.observe(trigger);
    }

    async function loadUsersWithPagination(container, type, options = {}) {
        currentPagination = { page: 0, hasMore: true, type, options };

        let trigger = container.querySelector('.load-more-trigger');
        if (trigger) trigger.remove();

        trigger = document.createElement('div');
        trigger.className = 'load-more-trigger';
        container.appendChild(trigger);

        const _contributors = await contributors;

        const renderUserCard = (u) => {
            const userCard = document.createElement('div');
            userCard.className = 'profile-card widget-item';

            const userLink = document.createElement('a');
            userLink.href = `#profile/${u.id}`;
            userLink.className = 'profile-link';
            userLink.style.cssText =
                'display:flex; align-items:center; gap:0.8rem; text-decoration:none; color:inherit;';

            const badgeHTML = u.admin
                ? ` <img src="icons/admin.png" class="admin-badge" title="NyaXTeam">`
                : _contributors.includes(u.id)
                    ? ` <img src="icons/contributor.png" class="contributor-badge" title="開発協力者">`
                    : u.verify
                        ? ` <img src="icons/verify.png" class="verify-badge" title="認証済み">`
                        : '';

            userLink.innerHTML = `
                <img src="${getUserIconUrl(u)}" style="width:48px; height:48px; border-radius:50%;" alt="${escapeHTML(u.name)}'s icon">
                <div>
                    <span class="name" style="font-weight:700;">${getEmoji(escapeHTML(u.name))}${badgeHTML}</span>
                    <span class="id" style="color:var(--secondary-text-color);">#${u.id}</span>
                    <p class="me" style="margin:0.2rem 0 0;">${getEmoji(escapeHTML(u.me || ''))}</p>
                </div>`;

            userCard.appendChild(userLink);
            return userCard;
        };

        const loadMore = async () => {
            if (isLoadingMore || !currentPagination.hasMore) return;
            isLoadingMore = true;
            trigger.innerHTML = '<div class="spinner"></div>';

            const from = currentPagination.page * POSTS_PER_PAGE;
            const to = from + POSTS_PER_PAGE - 1;

            let users = [];
            let error = null;

            const selectColumns =
                'id, name, me, scid, icon_data, admin, verify';

            if (type === 'follows') {
                const idsToFetch = (options.ids || []).slice(from, to + 1);
                if (idsToFetch.length > 0) {
                    const result = await supabase
                        .from('user')
                        .select(selectColumns)
                        .in('id', idsToFetch);
                    users = result.data;
                    error = result.error;
                }
            } else if (type === 'followers') {
                const result = await supabase
                    .rpc('get_followers', { target_user_id: options.userId })
                    .range(from, to);
                users = result.data;
                error = result.error;
            }

            if (error) {
                console.error(`${type}のユーザー読み込みに失敗:`, error);
                trigger.innerHTML = '読み込みに失敗しました。';
            } else {
                if (users && users.length > 0) {
                    await getUserTrustRank(
                        users.map((u) => u.id),
                        false,
                    );
                    users.forEach((u) =>
                        container.insertBefore(renderUserCard(u), trigger),
                    );
                    currentPagination.page++;
                    if (users.length < POSTS_PER_PAGE) {
                        currentPagination.hasMore = false;
                    }
                } else {
                    currentPagination.hasMore = false;
                }

                if (!currentPagination.hasMore) {
                    const emptyMessages = {
                        follows: '誰もフォローしていません。',
                        followers: 'まだフォロワーがいません。',
                    };
                    trigger.innerHTML =
                        container.querySelectorAll('.profile-card').length === 0
                            ? emptyMessages[type]
                            : 'すべてのユーザーを読み込みました';
                    if (postLoadObserver) postLoadObserver.unobserve(trigger);
                } else {
                    trigger.innerHTML = '';
                }
            }
            isLoadingMore = false;
        };

        postLoadObserver = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && !isLoadingMore) {
                    loadMore();
                }
            },
            { rootMargin: '200px' },
        );

        postLoadObserver.observe(trigger);
    }

    async function loadMediaGrid(container, options = {}) {
        currentPagination = { page: 0, hasMore: true, type: 'media', options };

        // グリッド用のコンテナを作成
        const gridContainer = document.createElement('div');
        gridContainer.className = 'media-grid-container';
        container.appendChild(gridContainer);

        let trigger = container.querySelector('.load-more-trigger');
        if (trigger) trigger.remove();

        trigger = document.createElement('div');
        trigger.className = 'load-more-trigger';
        container.appendChild(trigger);

        const MEDIA_PER_PAGE = 15; // メディアタブ専用の表示数

        const loadMore = async () => {
            if (isLoadingMore || !currentPagination.hasMore) return;
            isLoadingMore = true;
            trigger.innerHTML = '<div class="spinner"></div>';

            const from = currentPagination.page * MEDIA_PER_PAGE;
            const to = from + MEDIA_PER_PAGE - 1;

            const { data: mediaItems, error } = await supabase
                .rpc('get_user_media', { p_user_id: options.userId })
                .range(from, to);

            if (error) {
                console.error('メディアの読み込みに失敗:', error);
                trigger.innerHTML = '読み込みに失敗しました。';
            } else {
                if (mediaItems && mediaItems.length > 0) {
                    for (const item of mediaItems) {
                        const { data: publicUrlData } = supabase.storage
                            .from('nyax')
                            .getPublicUrl(item.file_id);

                        const itemLink = document.createElement('a');
                        itemLink.href = `#post/${item.post_id}`;
                        itemLink.className = 'media-grid-item';

                        if (item.file_type === 'image') {
                            itemLink.innerHTML = `<img src="${escapeHTML(publicUrlData.publicUrl)}" loading="lazy" alt="投稿メディア">`;
                        } else if (item.file_type === 'video') {
                            itemLink.innerHTML = `<video src="${escapeHTML(publicUrlData.publicUrl)}" muted playsinline loading="lazy"></video>`;
                        }
                        gridContainer.appendChild(itemLink);
                    }

                    currentPagination.page++;
                    if (mediaItems.length < MEDIA_PER_PAGE) {
                        currentPagination.hasMore = false;
                    }
                } else {
                    currentPagination.hasMore = false;
                }

                if (!currentPagination.hasMore) {
                    trigger.innerHTML = gridContainer.hasChildNodes()
                        ? ''
                        : 'メディアはありません。';
                    if (postLoadObserver) postLoadObserver.unobserve(trigger);
                } else {
                    trigger.innerHTML = '';
                }
            }
            isLoadingMore = false;
        };

        postLoadObserver = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && !isLoadingMore) {
                    loadMore();
                }
            },
            { rootMargin: '200px' },
        );

        postLoadObserver.observe(trigger);
    }

    async function switchTimelineTab(tab) {
        if (tab === 'following' && !currentUser) return;
        isLoadingMore = false; // 読み込み状態をリセット
        currentTimelineTab = tab;
        document
            .querySelectorAll('.timeline-tab-button')
            .forEach((btn) =>
                btn.classList.toggle('active', btn.dataset.tab === tab),
            );

        if (postLoadObserver) postLoadObserver.disconnect();
        DOM.timeline.innerHTML = '';
        await loadPostsWithPagination(DOM.timeline, 'timeline', { tab });
    }

    async function handleUpdateSettings(event) {
        event.preventDefault();
        if (!currentUser) return;

        const form = event.target;
        const button = form.querySelector('button[type="submit"]');
        button.disabled = true;
        showLoading(true);

        try {
            const updatedData = {
                name: form.querySelector('#setting-username').value.trim(),
                me: form.querySelector('#setting-me').value.trim(),
                settings: {
                    lock: form.querySelector('#setting-lock').checked,
                    show_like: form.querySelector('#setting-show-like').checked,
                    show_follow: form.querySelector('#setting-show-follow')
                        .checked,
                    show_follower: form.querySelector('#setting-show-follower')
                        .checked,
                    show_star: form.querySelector('#setting-show-star').checked,
                    show_scid: form.querySelector('#setting-show-scid').checked,
                    show_trust_label: form.querySelector('#setting-show-tlabel')
                        .checked,
                    default_timeline_tab: form.querySelector(
                        '#setting-default-timeline',
                    ).value,
                    emoji: form.querySelector('#setting-emoji-kind').value,
                    theme: form.querySelector('#setting-theme').value,
                },
            };

            if (!updatedData.name) throw new Error('ユーザー名は必須です。');

            // --- アイコンの更新・移行処理 ---
            if (resetIconToDefault) {
                // デフォルトに戻す場合、古いStorageのアイコンがあれば削除
                if (
                    currentUser.icon_data &&
                    !currentUser.icon_data.startsWith('data:image')
                ) {
                    await deleteFilesViaEdgeFunction([currentUser.icon_data]);
                }
                updatedData.icon_data = null;
            } else if (newIconDataUrl) {
                // 新しいアイコンが選択された場合
                // 古いStorageのアイコンがあれば削除
                if (
                    currentUser.icon_data &&
                    !currentUser.icon_data.startsWith('data:image')
                ) {
                    await deleteFilesViaEdgeFunction([currentUser.icon_data]);
                }
                // Data URLをBlobに変換してアップロード
                const blob = await (await fetch(newIconDataUrl)).blob();
                const fileId = await uploadFileViaEdgeFunction(
                    new File([blob], 'icon.png', { type: blob.type }),
                );
                updatedData.icon_data = fileId;
            } else if (
                currentUser.icon_data &&
                currentUser.icon_data.startsWith('data:image')
            ) {
                // Data URLをBlobに変換してアップロード
                const blob = await (await fetch(currentUser.icon_data)).blob();
                const fileId = await uploadFileViaEdgeFunction(
                    new File([blob], 'icon.png', { type: blob.type }),
                );
                updatedData.icon_data = fileId;
            }
            // --- ここまで ---

            const { data, error } = await supabase
                .from('user')
                .update(updatedData)
                .eq('id', currentUser.id)
                .select()
                .single();
            if (error) throw error;

            alert('設定を更新しました。');
            currentUser = data;

            // ここでアカウントリストも更新する
            updateAccountData(currentUser);

            newIconDataUrl = null;
            resetIconToDefault = false;
            window.location.hash = '';
        } catch (e) {
            console.error('設定の更新に失敗:', e);
            alert(`設定の更新に失敗しました: ${e.message}`);
        } finally {
            button.disabled = false;
            showLoading(false);
        }
    }

    // --- 11. ユーザーアクション ---
    window.copyPost = async (postId, button) => {
        await navigator.clipboard.writeText(
            `${window.location.origin}/#post/${postId}`,
        );
        if (button) {
            button.innerText = `コピーしました!`;
        }
    };
    window.pinPost = async (postId) => {
        let cmessage, emessage;

        if (!currentUser) return alert('ログインが必要です。');
        if (!currentUser.pin || currentUser.pin !== postId) {
            cmessage = 'このポストをピン留めしますか?';
            emessage = 'ポストのピン留め';
        } else {
            cmessage = 'このポストのピン留めを解除しますか?';
            emessage = 'ポストのピン留めの解除';
        }
        if (!confirm(cmessage)) return;
        showLoading(true);
        try {
            const { data: pinId, error: fetchError } = await supabase.rpc(
                'handle_pin',
                { p_post_id: postId },
            );
            if (fetchError)
                throw new Error(
                    `ポストのピン留め処理に失敗: ${fetchError.message}`,
                );
            currentUser.pin = pinId;
            router();
        } catch (e) {
            console.error(e);
            alert(`${emessage}に失敗しました。`);
        } finally {
            showLoading(false);
        }
    };
    window.deletePost = async (postId) => {
        if (!currentUser) return alert('ログインが必要です。');
        if (!confirm('このポストを削除しますか?')) return;
        showLoading(true);
        try {
            const { data: postData, error: fetchError } = await supabase
                .from('post')
                .select('attachments')
                .eq('id', postId)
                .single();
            if (fetchError)
                throw new Error(
                    `ポスト情報の取得に失敗: ${fetchError.message}`,
                );

            if (postData.attachments && postData.attachments.length > 0) {
                const fileIds = postData.attachments.map((file) => file.id);
                await deleteFilesViaEdgeFunction(fileIds);
            }

            const { error: deleteError } = await supabase
                .from('post')
                .delete()
                .eq('id', postId);
            if (deleteError) throw deleteError;

            router();
        } catch (e) {
            console.error(e);
            alert('削除に失敗しました。');
        } finally {
            showLoading(false);
        }
    };
    window.handleReplyClick = (postId, username) => {
        if (!currentUser) return alert('ログインが必要です。');
        openPostModal({ id: postId, name: username });
    };
    window.handleLike = async (button, postId) => {
        if (!currentUser) return alert('ログインが必要です。');
        button.disabled = true;

        const countSpan = button.querySelector('span:not(.icon)');
        const currentCount = parseInt(countSpan.textContent);

        try {
            const { data, error } = await supabase.rpc('handle_like', {
                p_post_id: postId,
            });

            if (error) throw error;

            const isLiked = data.liked;
            currentUser.like = data.updated_likes;

            countSpan.textContent = isLiked
                ? currentCount + 1
                : currentCount - 1;
            button.classList.toggle('liked', isLiked);
        } catch (e) {
            console.error('いいね更新エラー:', e);
            alert('いいねの更新に失敗しました。');
        } finally {
            button.disabled = false;
        }
    };
    window.handleStar = async (button, postId) => {
        if (!currentUser) return alert('ログインが必要です。');
        button.disabled = true;

        const countSpan = button.querySelector('span:not(.icon)');
        const currentCount = parseInt(countSpan.textContent);

        try {
            const { data, error } = await supabase.rpc('handle_star', {
                p_post_id: postId,
            });

            if (error) throw error;

            const isStarred = data.starred;
            currentUser.star = data.updated_stars;

            countSpan.textContent = isStarred
                ? currentCount + 1
                : currentCount - 1;
            button.classList.toggle('starred', isStarred);
        } catch (e) {
            console.error('お気に入り更新エラー:', e);
            alert('お気に入りの更新に失敗しました。');
        } finally {
            button.disabled = false;
        }
    };
    window.handleShowMaskedPost = async (button) => {
        button.disabled = true;

        const postMain = button.parentElement;
        const postMaskTitle = postMain.querySelector('.post-mask-title');

        if (postMaskTitle) postMaskTitle.remove();
        button.remove();

        const postContent = postMain.querySelector('.post-content');
        const postAttach = postMain.querySelector('.attachments-container');

        if (postAttach) postAttach.classList.remove('hidden');
        if (postContent) postContent.classList.remove('hidden');
    };
    window.handleFollowToggle = async (targetUserId, button, isLock) => {
        if (!currentUser) return alert('ログインが必要です。');
        button.disabled = true;

        try {
            const { data, error } = await supabase.rpc('handle_follow', {
                p_target_id: targetUserId,
            });

            if (error) throw error;

            const isFollowing = data.following;
            currentUser.follow = data.updated_follows;

            updateFollowButtonState(button, isFollowing, isLock);

            // フォロワー数を再取得（既存RPC呼び出しを継続利用）
            const followerCountSpan = document.querySelector(
                '#follower-count strong',
            );
            if (followerCountSpan) {
                const { data: newCount, error: newCountError } =
                    await supabase.rpc('get_follower_count', {
                        target_user_id: targetUserId,
                    });
                followerCountSpan.textContent = !newCountError ? newCount : '?';
            }
        } catch (e) {
            console.error('フォロー更新エラー:', e);
            alert('フォロー状態の更新に失敗しました。');
        } finally {
            button.disabled = false;
        }
    };

    async function openEditPostModal(postId) {
        showLoading(true);
        try {
            const { data: post, error } = await supabase
                .from('post')
                .select('content, mask,  attachments')
                .eq('id', postId)
                .single();
            if (error || !post)
                throw new Error('ポスト情報の取得に失敗しました。');

            let currentAttachments = post.attachments || [];
            let filesToDelete = new Set();
            let filesToAdd = [];

            const renderAttachments = () => {
                let existingAttachmentsHTML = '';
                currentAttachments.forEach((attachment, index) => {
                    if (filesToDelete.has(attachment.id)) return;
                    existingAttachmentsHTML += `
                        <div class="file-preview-item">
                            <span>${attachment.type === 'image' ? '🖼️' : '📎'} ${escapeHTML(attachment.name)}</span>
                            <button class="file-preview-remove" data-id="${attachment.id}" data-type="existing">×</button>
                        </div>`;
                });

                let newAttachmentsHTML = '';
                filesToAdd.forEach((file, index) => {
                    newAttachmentsHTML += `
                        <div class="file-preview-item">
                            <span>${file.type.startsWith('image/') ? '🖼️' : '📎'} ${escapeHTML(file.name)}</span>
                            <button class="file-preview-remove" data-index="${index}" data-type="new">×</button>
                        </div>`;
                });
                return existingAttachmentsHTML + newAttachmentsHTML;
            };

            const updatePreview = () => {
                const container = DOM.editPostModalContent.querySelector(
                    '.file-preview-container',
                );
                if (container) container.innerHTML = renderAttachments();
            };

            DOM.editPostModalContent.innerHTML = `
                <div class="post-form" style="padding: 1rem;">
                    <img src="${getUserIconUrl(currentUser)}" class="user-icon" alt="your icon">
                    <button class="modal-close-btn">×</button>
                    <div class="form-content">
                        <textarea id="edit-post-textarea" class="post-form-textarea">${post.content}</textarea>
                        <div class="file-preview-container" style="display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 1rem;">${renderAttachments()}</div>
                        <div class="post-form-actions" style="padding-top: 1rem;">
                            <button type="button" class="attachment-button float-left" title="ファイルを追加">${ICONS.attachment}</button>
                            <button type="button" class="emoji-pic-button float-left" title="絵文字を選択">${ICONS.emoji}</button>
                            <input type="file" id="edit-file-input" class="hidden" multiple>
                            <div id="emoji-picker" class="hidden"></div>
                            <button id="update-post-button" style="padding: 0.5rem 1.5rem; border-radius: 9999px; border: none; background-color: var(--primary-color); color: white; font-weight: 700; margin-left: auto;" class="float-right">保存</button>
                            <button type="button" class="post-mask-button float-right ${post.mask ? 'active' : ''}" title="ワンクッション">${ICONS.mask}</button>
                            <span class="float-clear"></span>
                        </div>
                    </div>
                </div>
            `;

            await emoji_picker_create(DOM.editPostModalContent);

            DOM.editPostModal.querySelector('#update-post-button').onclick =
                () =>
                    handleUpdatePost(
                        postId,
                        currentAttachments,
                        filesToAdd,
                        Array.from(filesToDelete),
                    );
            DOM.editPostModal.querySelector('.modal-close-btn').onclick = () =>
                DOM.editPostModal.classList.add('hidden');

            DOM.editPostModal.addEventListener('keydown', (e) => {
                if (e.ctrlKey && e.key === 'Enter') {
                    e.preventDefault();
                    DOM.editPostModal
                        .querySelector('#update-post-button')
                        .click();
                }
            });

            DOM.editPostModal.querySelector('.attachment-button').onclick =
                () => {
                    DOM.editPostModal.querySelector('#edit-file-input').click();
                };

            DOM.editPostModal.querySelector('#edit-file-input').onchange = (
                e,
            ) => {
                filesToAdd.push(...Array.from(e.target.files));
                updatePreview();
            };

            DOM.editPostModal.querySelector('.post-mask-button').onclick =
                () => {
                    DOM.editPostModal
                        .querySelector('.post-mask-button')
                        .classList.toggle('active');
                };

            DOM.editPostModal.querySelector('.file-preview-container').onclick =
                (e) => {
                    if (e.target.classList.contains('file-preview-remove')) {
                        const type = e.target.dataset.type;
                        if (type === 'existing') {
                            filesToDelete.add(e.target.dataset.id);
                        } else if (type === 'new') {
                            const index = parseInt(e.target.dataset.index);
                            filesToAdd.splice(index, 1);
                        }
                        updatePreview();
                    }
                };

            DOM.editPostModal.classList.remove('hidden');
            DOM.editPostModal.querySelector('#edit-post-textarea').focus();
        } catch (e) {
            console.error(e);
            alert(e.message);
        } finally {
            showLoading(false);
        }
    }

    window.openDmManageModal = async function (dmId) {
        DOM.dmManageModalContent.innerHTML = '<div class="spinner"></div>';
        DOM.dmManageModal.classList.remove('hidden');
        DOM.dmManageModal.querySelector('.modal-close-btn').onclick = () =>
            DOM.dmManageModal.classList.add('hidden');

        try {
            const { data: dm, error } = await supabase
                .from('dm')
                .select('id, title, member, host_id')
                .eq('id', dmId)
                .single();
            if (error || !dm) throw new Error('DM情報の取得に失敗しました。');

            const isHost = dm.host_id === currentUser.id;
            const memberDetails = await Promise.all(
                dm.member.map(
                    async (id) =>
                        allUsersCache[id] ||
                        (
                            await supabase
                                .from('user')
                                .select('id, name')
                                .eq('id', id)
                                .single()
                        ).data,
                ),
            );

            let html = `<div style="padding: 1.5rem; display: flex; flex-direction: column; gap: 1.5rem;"><h3>メッセージ管理</h3>`;

            if (isHost) {
                html += `
                    <div>
                        <label for="dm-title-input" style="font-weight: bold; display: block; margin-bottom: 0.5rem;">タイトル</label>
                        <input type="text" id="dm-title-input" value="${getEmoji(escapeHTML(dm.title || ''))}" style="width: 100%; padding: 0.8rem; border: 1px solid var(--border-color); border-radius: 8px;">
                        <button id="save-dm-title-btn" style="margin-top: 0.5rem;">タイトルを保存</button>
                    </div>
                    <div>
                        <h4 style="margin: 0 0 0.5rem 0;">メンバー (${dm.member.length})</h4>
                        <div id="dm-member-list">
                            ${memberDetails
                                .map(
                                    (m) => `
                                <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.5rem 0;">
                                    <span>${getEmoji(escapeHTML(m.name))} (#${m.id}) ${m.id === dm.host_id ? '(ホスト)' : ''}</span>
                                    <div id="dm-modal-btn">
                                        ${m.id !== dm.host_id ? `<button class="sethost-member-btn" data-user-id="${m.id}" data-user-name="${escapeHTML(m.name)}">管理者権限を譲渡</button>` : ''}
                                        ${m.id !== dm.host_id ? `<button class="remove-member-btn" data-user-id="${m.id}" data-user-name="${escapeHTML(m.name)}">削除</button>` : ''}
                                    </div>
                                </div>`,
                                )
                                .join('')}
                        </div>
                    </div>
                    <div>
                        <label for="dm-add-member-search" style="font-weight: bold; display: block; margin-bottom: 0.5rem;">メンバーを追加</label>
                        <input type="text" id="dm-add-member-search" placeholder="ユーザー名またはIDで検索" style="width: 100%; padding: 0.8rem; border: 1px solid var(--border-color); border-radius: 8px;">
                        <div id="dm-add-member-results" style="margin-top: 0.5rem; max-height: 150px; overflow-y: auto;"></div>
                    </div>
                    <button id="disband-dm-btn" style="align-self: flex-end;">DMを解散</button>
                `;
            } else {
                html += `
                    <p>このDMから退出しますか？<br>一度退出すると、再度招待されない限り参加できません。</p>
                    <button id="leave-dm-btn" style="align-self: flex-end;">DMから退出</button>
                `;
            }
            html += `</div>`;
            DOM.dmManageModalContent.innerHTML = html;

            // Event Listeners
            if (isHost) {
                document.getElementById('save-dm-title-btn').onclick = () =>
                    handleUpdateDmTitle(
                        dmId,
                        document.getElementById('dm-title-input').value,
                    );
                document.getElementById('disband-dm-btn').onclick = () =>
                    handleDisbandDm(dmId);

                document
                    .querySelectorAll('.remove-member-btn')
                    .forEach((btn) => {
                        const userId = parseInt(btn.dataset.userId);
                        const userName = btn.dataset.userName;
                        btn.onclick = () =>
                            handleRemoveDmMember(dmId, userId, userName);
                    });

                document
                    .querySelectorAll('.sethost-member-btn')
                    .forEach((btn) => {
                        const userId = parseInt(btn.dataset.userId);
                        const userName = btn.dataset.userName;
                        btn.onclick = () =>
                            handleSetHostDmMember(dmId, userId, userName);
                    });

                const searchInput = document.getElementById(
                    'dm-add-member-search',
                );
                const resultsContainer = document.getElementById(
                    'dm-add-member-results',
                );
                let searchTimeout;
                searchInput.addEventListener('input', () => {
                    clearTimeout(searchTimeout);
                    searchTimeout = setTimeout(async () => {
                        const query = searchInput.value.trim();
                        if (query.length < 2) {
                            resultsContainer.innerHTML = '';
                            return;
                        }

                        const { data: users } = await supabase
                            .from('user')
                            .select('id, name')
                            .or(
                                `name.ilike.%${query}%,id.eq.${parseInt(query) || 0}`,
                            )
                            .limit(5);
                        const nonMembers = users.filter(
                            (u) => !dm.member.includes(u.id),
                        );

                        resultsContainer.innerHTML =
                            nonMembers.length > 0
                                ? nonMembers
                                        .map(
                                            (u) =>
                                                `<div class="widget-item" style="cursor: pointer;" data-user-id="${u.id}"><strong>${getEmoji(escapeHTML(u.name))}</strong> (#${u.id})</div>`,
                                        )
                                        .join('')
                                : `<div class="widget-item">ユーザーが見つかりません。</div>`;
                    }, 300);
                });
                resultsContainer.addEventListener('click', (e) => {
                    const userDiv = e.target.closest('[data-user-id]');
                    if (userDiv) {
                        const userId = parseInt(userDiv.dataset.userId);
                        const userName =
                            userDiv.querySelector('strong').textContent;
                        handleAddDmMember(dmId, userId, userName);
                    }
                });
            } else {
                document.getElementById('leave-dm-btn').onclick = () =>
                    handleLeaveDm(dmId);
            }
        } catch (e) {
            DOM.dmManageModalContent.innerHTML = `<p style="padding: 1.5rem;">${escapeHTML(e.message)}</p>`;
            console.error(e);
        }
    };

    async function handleUpdateDmTitle(dmId, newTitle) {
        const { error } = await supabase
            .from('dm')
            .update({ title: newTitle.trim() })
            .eq('id', dmId);
        if (error) {
            alert('タイトルの更新に失敗しました。');
        } else {
            alert('タイトルを更新しました。');
            DOM.dmManageModal.classList.add('hidden');
            openDmManageModal(dmId); // モーダルを再描画
        }
    }

    async function handleRemoveDmMember(
        dmId,
        userIdToRemove,
        userNameToRemove,
    ) {
        if (!confirm(`${userNameToRemove}さんをDMから削除しますか?`)) return;

        const { data: dm } = await supabase
            .from('dm')
            .select('member')
            .eq('id', dmId)
            .single();
        const updatedMembers = dm.member.filter((id) => id !== userIdToRemove);

        const { error } = await supabase
            .from('dm')
            .update({ member: updatedMembers })
            .eq('id', dmId);
        if (error) {
            alert('メンバーの削除に失敗しました。');
        } else {
            await sendSystemDmMessage(
                dmId,
                `@${currentUser.id}さんが@${userIdToRemove}さんを強制退出させました`,
            );
            sendNotification(
                userIdToRemove,
                `@${currentUser.id}さんによってDMから削除されました。`,
            );
            alert('メンバーを削除しました。');
            openDmManageModal(dmId); // モーダルを再描画
        }
    }

    async function handleSetHostDmMember(dmId, userIdToHost, userNameToHost) {
        if (!confirm(`${userNameToHost}さんに管理者権限を譲渡しますか?`))
            return;

        // わんちゃん失敗するけど管理者権限無いとシステムメッセージ送れないので先に送信
        await sendSystemDmMessage(
            dmId,
            `@${currentUser.id}さんが@${userIdToHost}さんに管理者権限を譲渡しました`,
        );

        const { error } = await supabase
            .from('dm')
            .update({ host_id: userIdToHost })
            .eq('id', dmId);
        if (error) {
            alert('権限の譲渡に失敗しました。');
        } else {
            sendNotification(
                userIdToHost,
                `@${currentUser.id}さんから管理者権限を受け取りました。`,
                `#dm/${dmId}`,
            );
            alert('権限を譲渡しました。');
            openDmManageModal(dmId); // モーダルを再描画
        }
    }

    async function handleAddDmMember(dmId, userIdToAdd, userNameToAdd) {
        if (!confirm(`${userNameToAdd}さんをDMに追加しますか？`)) return;

        const { data: dm } = await supabase
            .from('dm')
            .select('member')
            .eq('id', dmId)
            .single();
        if (dm.member.includes(userIdToAdd)) {
            alert('このユーザーは既にメンバーです。');
            return;
        }
        const updatedMembers = [...dm.member, userIdToAdd];

        const { error } = await supabase
            .from('dm')
            .update({ member: updatedMembers })
            .eq('id', dmId);
        if (error) {
            alert('メンバーの追加に失敗しました。');
        } else {
            await sendSystemDmMessage(
                dmId,
                `@${currentUser.id}さんが@${userIdToAdd}さんを招待しました`,
            );
            sendNotification(
                userIdToAdd,
                `@${currentUser.id}さんがあなたをDMに招待しました。`,
                `#dm/${dmId}`,
            );
            alert('メンバーを追加しました。');
            openDmManageModal(dmId); // モーダルを再描画
        }
    }

    async function handleLeaveDm(dmId) {
        if (!confirm('本当にこのDMから退出しますか？')) return;
        showLoading(true);

        try {
            // 退出したことをシステムメッセージとして記録（これはメンバー権限で実行可能）
            await sendSystemDmMessage(
                dmId,
                `@${currentUser.id}さんが退出しました`,
            );

            // 新しいDB関数を呼び出す
            const { error } = await supabase.rpc('leave_dm', {
                dm_id_to_leave: dmId,
                user_id_to_leave: currentUser.id,
            });

            if (error) throw error;

            alert('DMから退出しました。');
            DOM.dmManageModal.classList.add('hidden');

            window.location.hash = '#dm';
            await showDmScreen();
        } catch (e) {
            console.error('DMからの退出に失敗しました:', e);
            alert('DMからの退出に失敗しました。');
        } finally {
            showLoading(false);
        }
    }

    async function handleDisbandDm(dmId) {
        if (!confirm('本当にこのDMを解散しますか？この操作は取り消せません。'))
            return;
        showLoading(true);
        try {
            // 添付ファイルを全て削除
            const { data: dm, error: fetchError } = await supabase
                .from('dm')
                .select('post')
                .eq('id', dmId)
                .single();
            if (fetchError) throw fetchError;

            const fileIdsToDelete = (dm.post || [])
                .flatMap((msg) => msg.attachments || [])
                .map((att) => att.id);

            if (fileIdsToDelete.length > 0) {
                await deleteFilesViaEdgeFunction(fileIdsToDelete);
            }

            // DMを削除
            const { error } = await supabase.from('dm').delete().eq('id', dmId);
            if (error) throw error;

            alert('DMを解散しました。');
            DOM.dmManageModal.classList.add('hidden');
            window.location.hash = '#dm';
            await showDmScreen();
        } catch (e) {
            console.error(e);
            alert('DMの解散に失敗しました。');
        } finally {
            showLoading(false);
        }
    }

    async function sendSystemDmMessage(dmId, content) {
        const mentionRegex = /@(\d+)/g;
        const mentionedIds = new Set();
        for (const match of content.matchAll(/@(\d+)/g)) {
            mentionedIds.add(parseInt(match[1]));
        }

        const newIdsToFetch = [...mentionedIds].filter(
            (id) => !allUsersCache.has(id),
        );
        if (newIdsToFetch.length > 0) {
            const { data: newUsers } = await supabase
                .from('user')
                .select('id, name, scid, icon_data, block')
                .in('id', newIdsToFetch);
            if (newUsers) newUsers.forEach((u) => allUsersCache.set(u.id, u));
        }

        const message = {
            id: crypto.randomUUID(),
            time: new Date().toISOString(),
            type: 'system',
            content: content,
        };
        await supabase.rpc('append_to_dm_post', {
            dm_id_in: dmId,
            new_message_in: message,
        });
    }

    async function handleUpdatePost(
        postId,
        originalAttachments,
        filesToAdd,
        filesToDeleteIds,
    ) {
        const newContent = DOM.editPostModal
            .querySelector('#edit-post-textarea')
            .value.trim();
        const maskActive = DOM.editPostModal
            .querySelector('.post-mask-button')
            .classList.contains('active');
        const editPostTextarea = DOM.editPostModal.querySelector(
            '#edit-post-textarea',
        );
        if (!newContent)
            return alert('内容を入力するか、ファイルを添付してください。');

        const button = DOM.editPostModal.querySelector('#update-post-button');
        button.disabled = true;
        button.textContent = '保存中...';
        showLoading(true);

        try {
            // 1. ファイルを削除
            if (filesToDeleteIds.length > 0) {
                await deleteFilesViaEdgeFunction(filesToDeleteIds);
            }

            // 2. ファイルをアップロード
            let newUploadedAttachments = [];
            if (filesToAdd.length > 0) {
                for (const file of filesToAdd) {
                    const fileId = await uploadFileViaEdgeFunction(file);
                    const fileType = file.type.startsWith('image/')
                        ? 'image'
                        : file.type.startsWith('video/')
                            ? 'video'
                            : file.type.startsWith('audio/')
                                ? 'audio'
                                : 'file';
                    newUploadedAttachments.push({
                        type: fileType,
                        id: fileId,
                        name: file.name,
                    });
                }
            }

            // 3. 添付ファイルリストを更新
            let finalAttachments = originalAttachments.filter(
                (att) => !filesToDeleteIds.includes(att.id),
            );
            finalAttachments.push(...newUploadedAttachments);

            // 4. ポスト情報をDBで更新
            const { error: postUpdateError } = await supabase
                .from('post')
                .update({
                    content: newContent,
                    attachments:
                        finalAttachments.length > 0 ? finalAttachments : null,
                    mask: maskActive,
                })
                .eq('id', postId);
            if (postUpdateError) throw postUpdateError;

            DOM.editPostModal.classList.add('hidden');
            router(); // 画面を再読み込みして変更を反映
        } catch (e) {
            console.error(e);
            alert('ポストの更新に失敗しました。');
        } finally {
            button.disabled = false;
            button.textContent = '保存';
            showLoading(false);
        }
    }

    // --- [新規追加] DM操作関数 ---
    async function handleDmButtonClick(targetUserId) {
        if (!currentUser) return;
        const members = [currentUser.id, targetUserId].sort((a, b) => a - b);

        const { data: existingDm } = await supabase
            .from('dm')
            .select('id')
            .contains('member', members)
            .eq('member', `{${members.join(',')}}`)
            .single();

        if (existingDm) {
            window.location.hash = `#dm/${existingDm.id}`;
        } else {
            const { data: targetUser } = await supabase
                .from('user')
                .select('name')
                .eq('id', targetUserId)
                .single();
            if (confirm(`${targetUser.name}さんとの新しいDMを作成しますか？`)) {
                showLoading(true);
                try {
                    const { data: newDm, error: createError } = await supabase
                        .from('dm')
                        .insert({
                            host_id: currentUser.id,
                            member: members,
                            title: `${currentUser.name}, ${targetUser.name}`,
                        })
                        .select('id')
                        .single();

                    if (createError) throw createError;

                    // 招待通知を送信
                    await sendNotification(
                        targetUserId,
                        `@${currentUser.id}さんがあなたをDMに招待しました。`,
                        `#dm/${newDm.id}`,
                    );
                    window.location.hash = `#dm/${newDm.id}`;
                } catch (e) {
                    alert('DMの作成に失敗しました。');
                    console.error(e);
                } finally {
                    showLoading(false);
                }
            }
        }
    }

    async function openDmEditModal(dmId, messageId) {
        showLoading(true);
        try {
            const { data: dm, error: fetchError } = await supabase
                .from('dm')
                .select('post')
                .eq('id', dmId)
                .single();
            if (fetchError || !dm)
                throw new Error('DM情報が取得できませんでした。');

            const message = (dm.post || []).find((m) => m.id === messageId);
            if (!message) throw new Error('メッセージが見つかりませんでした。');

            let currentAttachments = message.attachments || [];
            let filesToDelete = new Set();
            let filesToAdd = [];

            const renderAttachments = () => {
                let existingHTML = currentAttachments
                    .filter((att) => !filesToDelete.has(att.id))
                    .map(
                        (att, index) => `
                        <div class="file-preview-item">
                            <span>${att.type.startsWith('image') ? '🖼️' : '📎'} ${escapeHTML(att.name)}</span>
                            <button class="file-preview-remove" data-id="${att.id}" data-type="existing">×</button>
                        </div>`,
                    )
                    .join('');

                let newHTML = filesToAdd
                    .map(
                        (file, index) => `
                        <div class="file-preview-item">
                            <span>${file.type.startsWith('image') ? '🖼️' : '📎'} ${escapeHTML(file.name)}</span>
                            <button class="file-preview-remove" data-index="${index}" data-type="new">×</button>
                        </div>`,
                    )
                    .join('');
                return existingHTML + newHTML;
            };

            const updatePreview = () => {
                const container = DOM.editDmMessageModalContent.querySelector(
                    '.file-preview-container',
                );
                if (container) container.innerHTML = renderAttachments();
            };

            DOM.editDmMessageModalContent.innerHTML = `
                <div class="post-form" style="padding: 1rem;">
                    <button class="modal-close-btn">×</button>
                    <div class="form-content">
                        <textarea id="edit-dm-textarea" style="min-height: 100px; font-size: 1rem;">${message.content || ''}</textarea>
                        <div class="file-preview-container" style="display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 1rem;"></div>
                        <div class="post-form-actions" style="padding-top: 1rem;">
                            <button type="button" class="attachment-button float-left" title="ファイルを追加">${ICONS.attachment}</button>
                            <button type="button" class="emoji-pic-button float-left" title="絵文字を選択">${ICONS.emoji}</button>
                            <input type="file" id="edit-dm-file-input" class="hidden" multiple>
                            <div id="emoji-picker" class="hidden"></div>
                            <button id="update-dm-message-button" style="padding: 0.5rem 1.5rem; border-radius: 9999px; border: none; background-color: var(--primary-color); color: white; font-weight: 700; margin-left: auto;" class="float-right">保存</button>
                            <span class="float-clear"></span>
                        </div>
                    </div>
                </div>`;

            await emoji_picker_create(DOM.editDmMessageModalContent);

            updatePreview();

            DOM.editDmMessageModal.querySelector(
                '#update-dm-message-button',
            ).onclick = () =>
                handleUpdateDmMessage(
                    dmId,
                    messageId,
                    currentAttachments,
                    filesToAdd,
                    Array.from(filesToDelete),
                );
            DOM.editDmMessageModal.querySelector('.attachment-button').onclick =
                () =>
                    DOM.editDmMessageModal
                        .querySelector('#edit-dm-file-input')
                        .click();

            DOM.editDmMessageModal.querySelector(
                '#edit-dm-file-input',
            ).onchange = (e) => {
                filesToAdd.push(...Array.from(e.target.files));
                updatePreview();
            };

            DOM.editDmMessageModal.querySelector(
                '.file-preview-container',
            ).onclick = (e) => {
                if (e.target.classList.contains('file-preview-remove')) {
                    const type = e.target.dataset.type;
                    if (type === 'existing') {
                        filesToDelete.add(e.target.dataset.id);
                    } else if (type === 'new') {
                        const index = parseInt(e.target.dataset.index);
                        filesToAdd.splice(index, 1);
                    }
                    updatePreview();
                }
            };

            DOM.editDmMessageModal.classList.remove('hidden');
            DOM.editDmMessageModal.querySelector('.modal-close-btn').onclick =
                () => DOM.editDmMessageModal.classList.add('hidden');
        } catch (e) {
            alert(e.message);
        } finally {
            showLoading(false);
        }
    }

    async function handleUpdateDmMessage(
        dmId,
        messageId,
        originalAttachments,
        filesToAdd,
        filesToDeleteIds,
    ) {
        const newContent = DOM.editDmMessageModal
            .querySelector('#edit-dm-textarea')
            .value.trim();
        const button = DOM.editDmMessageModal.querySelector(
            '#update-dm-message-button',
        );
        button.disabled = true;
        button.textContent = '保存中...';
        showLoading(true);

        try {
            // ファイルの削除
            if (filesToDeleteIds.length > 0) {
                await deleteFilesViaEdgeFunction(filesToDeleteIds);
            }

            // ファイルのアップロード
            let newUploadedAttachments = [];
            if (filesToAdd.length > 0) {
                for (const file of filesToAdd) {
                    const fileId = await uploadFileViaEdgeFunction(file);
                    const fileType = file.type.startsWith('image/')
                        ? 'image'
                        : file.type.startsWith('video/')
                            ? 'video'
                            : file.type.startsWith('audio/')
                                ? 'audio'
                                : 'file';
                    newUploadedAttachments.push({
                        type: fileType,
                        id: fileId,
                        name: file.name,
                    });
                }
            }

            const finalAttachments = originalAttachments.filter(
                (att) => !filesToDeleteIds.includes(att.id),
            );
            finalAttachments.push(...newUploadedAttachments);

            // DMのpost配列を更新
            const { data: dm, error: fetchError } = await supabase
                .from('dm')
                .select('post')
                .eq('id', dmId)
                .single();
            if (fetchError) throw fetchError;

            const postArray = dm.post || [];
            const messageIndex = postArray.findIndex((m) => m.id === messageId);
            if (messageIndex === -1)
                throw new Error('更新対象のメッセージが見つかりません。');

            postArray[messageIndex].content = newContent;
            postArray[messageIndex].attachments = finalAttachments;

            const { error: updateError } = await supabase
                .from('dm')
                .update({ post: postArray })
                .eq('id', dmId);
            if (updateError) throw updateError;

            DOM.editDmMessageModal.classList.add('hidden');
            // 画面を再描画して変更を反映
            const messageContainer = document.querySelector(
                `.dm-message-container[data-message-id="${messageId}"]`,
            );
            if (messageContainer) {
                messageContainer.outerHTML = await renderDmMessage(
                    postArray[messageIndex],
                );
            }
        } catch (e) {
            console.error(e);
            alert('メッセージの更新に失敗しました。');
        } finally {
            button.disabled = false;
            button.textContent = '保存';
            showLoading(false);
        }
    }

    async function handleDeleteDmMessage(dmId, messageId) {
        if (!confirm('このメッセージを削除しますか?')) return;
        showLoading(true);
        try {
            const { data: dm, error: fetchError } = await supabase
                .from('dm')
                .select('post')
                .eq('id', dmId)
                .single();
            if (fetchError) throw fetchError;

            const postArray = dm.post || [];
            const messageToDelete = postArray.find((m) => m.id === messageId);
            const updatedPostArray = postArray.filter(
                (m) => m.id !== messageId,
            );

            // 添付ファイルをストレージから削除
            if (messageToDelete && messageToDelete.attachments?.length > 0) {
                const fileIds = messageToDelete.attachments.map(
                    (att) => att.id,
                );
                await deleteFilesViaEdgeFunction(fileIds);
            }

            // DMのpost配列を更新
            const { error: updateError } = await supabase
                .from('dm')
                .update({ post: updatedPostArray })
                .eq('id', dmId);
            if (updateError) throw updateError;

            // DOMからメッセージを削除
            document
                .querySelector(
                    `.dm-message-container[data-message-id="${messageId}"]`,
                )
                ?.remove();
        } catch (e) {
            console.error(e);
            alert('メッセージの削除に失敗しました。');
        } finally {
            showLoading(false);
        }
    }

    window.openCreateDmModal = function () {
        DOM.createDmModalContent.innerHTML = `
            <div style="padding: 1.5rem;">
                <h3>新しいメッセージ</h3>
                <p>ユーザーを検索してDMを開始します。</p>
                <input type="text" id="dm-user-search" placeholder="ユーザー名またはIDで検索" style="width: 100%; padding: 0.8rem; border: 1px solid var(--border-color); border-radius: 8px;">
                <div id="dm-user-search-results" style="margin-top: 1rem; max-height: 200px; overflow-y: auto;"></div>
            </div>
        `;

        const searchInput =
            DOM.createDmModalContent.querySelector('#dm-user-search');
        const resultsContainer = DOM.createDmModalContent.querySelector(
            '#dm-user-search-results',
        );

        let searchTimeout;
        searchInput.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(async () => {
                const query = searchInput.value.trim();
                if (query.length < 2) {
                    resultsContainer.innerHTML = '';
                    return;
                }
                const { data: users, error } = await supabase
                    .from('user')
                    .select('id, name, scid')
                    .or(`name.ilike.%${query}%,id.eq.${parseInt(query) || 0}`)
                    .neq('id', currentUser.id)
                    .limit(5);

                if (users && users.length > 0) {
                    resultsContainer.innerHTML = users
                        .map(
                            (u) => `
                        <div class="widget-item" style="cursor: pointer;" data-user-id="${u.id}" data-user-name="${escapeHTML(u.name)}">
                            <strong>${getEmoji(escapeHTML(u.name))}</strong> (#${u.id})
                        </div>
                    `,
                        )
                        .join('');
                } else {
                    resultsContainer.innerHTML = `<div class="widget-item">ユーザーが見つかりません。</div>`;
                }
            }, 300);
        });

        resultsContainer.addEventListener('click', (e) => {
            const userDiv = e.target.closest('[data-user-id]');
            if (userDiv) {
                const targetUserId = parseInt(userDiv.dataset.userId);
                DOM.createDmModal.classList.add('hidden');
                handleDmButtonClick(targetUserId);
            }
        });

        DOM.createDmModal.classList.remove('hidden');
        DOM.createDmModal.querySelector('.modal-close-btn').onclick = () => {
            DOM.createDmModal.classList.add('hidden');
        };
    };

    async function sendDmMessage(dmId, files = []) {
        const input = document.getElementById('dm-message-input');
        const content = input.value.trim();
        if (!content && files.length === 0) return;

        const sendButton = document.getElementById('send-dm-btn');
        input.disabled = true;
        sendButton.disabled = true;

        try {
            const mentionedIds = new Set();
            for (const match of content.matchAll(/@(\d+)/g)) {
                mentionedIds.add(parseInt(match[1]));
            }

            const newIdsToFetch = [...mentionedIds].filter(
                (id) => !allUsersCache.has(id),
            );
            if (newIdsToFetch.length > 0) {
                const { data: newUsers } = await supabase
                    .from('user')
                    .select('id, name, scid, icon_data, block')
                    .in('id', newIdsToFetch);
                if (newUsers)
                    newUsers.forEach((u) => allUsersCache.set(u.id, u));
            }

            let attachmentsData = [];
            if (files.length > 0) {
                showLoading(true);
                for (const file of files) {
                    const fileId = await uploadFileViaEdgeFunction(file);
                    const fileType = file.type.startsWith('image/')
                        ? 'image'
                        : file.type.startsWith('video/')
                            ? 'video'
                            : file.type.startsWith('audio/')
                                ? 'audio'
                                : 'file';
                    attachmentsData.push({
                        type: fileType,
                        id: fileId,
                        name: file.name,
                    });
                }
                showLoading(false);
            }

            const message = {
                id: crypto.randomUUID(),
                time: new Date().toISOString(),
                userid: currentUser.id,
                content: content,
                attachments: attachmentsData,
                read: [currentUser.id],
            };

            const { error } = await supabase.rpc('append_to_dm_post', {
                dm_id_in: dmId,
                new_message_in: message,
            });

            if (error) {
                throw error;
            } else {
                input.value = '';
                const view = document.querySelector('.dm-conversation-view');
                if (view) {
                    const msgHTML = await renderDmMessage(message);
                    view.insertAdjacentHTML('afterbegin', msgHTML);
                    lastRenderedMessageId = message.id;
                    view.scrollTop = view.scrollHeight;
                }
            }
        } catch (error) {
            alert('メッセージの送信に失敗しました。');
            console.error(error);
        } finally {
            input.disabled = false;
            sendButton.disabled = false;
            input.focus();
        }
    }

    function openProfileMenu(targetUser) {
        document.getElementById('profile-menu')?.remove();

        const menu = document.createElement('div');
        menu.id = 'profile-menu';
        menu.className = 'post-menu is-visible';

        // ブロック/ブロック解除
        if (currentUser.id !== targetUser.id) {
            const isBlocked =
                Array.isArray(currentUser.block) &&
                currentUser.block.includes(targetUser.id);
            const blockBtn = document.createElement('button');
            blockBtn.textContent = isBlocked ? 'ブロック解除' : 'ブロック';
            blockBtn.onclick = async () => {
                blockBtn.disabled = true;
                let updatedBlock = isBlocked
                    ? currentUser.block.filter((id) => id !== targetUser.id)
                    : [...(currentUser.block || []), targetUser.id];
                const { error } = await supabase
                    .from('user')
                    .update({ block: updatedBlock })
                    .eq('id', currentUser.id);
                if (!error) {
                    currentUser.block = updatedBlock;
                    updateAccountData(currentUser);
                    menu.remove();
                    await showProfileScreen(targetUser.id);
                } else {
                    alert('ブロック操作に失敗しました');
                    blockBtn.disabled = false;
                }
            };
            menu.appendChild(blockBtn);
        }

        // NyaXTeamのみのメニュー
        if (currentUser.admin) {
            const verifyBtn = document.createElement('button');
            verifyBtn.textContent = targetUser.verify
                ? '認証を取り消す'
                : 'このユーザーを認証';
            verifyBtn.onclick = () => adminToggleVerify(targetUser);

            const sendNoticeBtn = document.createElement('button');
            sendNoticeBtn.textContent = '通知を送信';
            sendNoticeBtn.onclick = () => adminSendNotice(targetUser.id);

            const trustBtn = document.createElement('button');
            trustBtn.textContent = 'TSの付与/剥奪';
            trustBtn.onclick = () => adminChangeTrust(targetUser);

            const shadowBtn = document.createElement('button');
            shadowBtn.textContent = targetUser.shadow
                ? '検索除外を解除'
                : '検索除外';
            shadowBtn.className = 'delete-btn';
            shadowBtn.onclick = () => adminToggleShadow(targetUser);

            const freezeBtn = document.createElement('button');
            freezeBtn.textContent = 'アカウントを凍結';
            freezeBtn.className = 'delete-btn';
            freezeBtn.onclick = () => adminFreezeAccount(targetUser.id);

            menu.appendChild(verifyBtn);
            menu.appendChild(sendNoticeBtn);
            menu.appendChild(trustBtn);
            menu.appendChild(shadowBtn);
            menu.appendChild(freezeBtn);
        }

        menu.style.top = `auto`;
        menu.style.right = 'auto';
        menu.style.transform = 'translateY(3rem)';
        const acts = document.getElementById('profile-actions');
        acts.appendChild(menu);

        setTimeout(() => {
            document.addEventListener('click', () => menu.remove(), {
                once: true,
            });
        }, 0);
    }

    async function adminToggleVerify(targetUser) {
        const newVerifyStatus = !targetUser.verify;
        const actionText = newVerifyStatus ? '認証' : '認証の取り消し';

        if (confirm(`本当にこのユーザーの${actionText}を行いますか?`)) {
            const { error } = await supabase
                .from('user')
                .update({ verify: newVerifyStatus })
                .eq('id', targetUser.id);

            if (error) {
                alert(`${actionText}に失敗しました: ${error.message}`);
            } else {
                alert(
                    `ユーザーの${actionText}が完了しました。\nページをリロードします。`,
                );
                window.location.reload();
            }
        }
    }

    async function adminSendNotice(targetUserId) {
        const message = prompt('送信する通知メッセージを入力してください:');
        if (message && message.trim()) {
            await sendNotification(
                targetUserId,
                `${message.trim()} - NyaXTeam`,
            );
            alert('通知を送信しました。');
        }
    }

    async function adminChangeTrust(targetUser) {
        const message = prompt(
            `このユーザーの現在のTrustScore: ${targetUser.trust}\n付与/剥奪する量を入力してください`,
        );
        if (message) {
            if (isNaN(message)) {
                alert('エラー: TrustScoreには数値のみが許可されています');
                return;
            }
            const { error } = await supabase.rpc('admin_set_status', {
                p_id: targetUser.id,
                p_trust: message,
            });
            if (error) {
                alert(`TrustScoreの変更に失敗しました: ${error.message}`);
            } else {
                alert(
                    `TrustScodeの変更が完了しました。\nページをリロードします。`,
                );
                window.location.reload();
            }
        }
    }

    async function adminToggleShadow(targetUser) {
        const newShadowStatus = !targetUser.shadow;
        const actionText = newShadowStatus ? '有効' : '無効';

        if (confirm(`本当にこのユーザーの検索除外を${actionText}にしますか?`)) {
            const { error } = await supabase.rpc('admin_set_status', {
                p_id: targetUser.id,
                p_shadow: newShadowStatus,
            });

            if (error) {
                alert(`${actionText}に失敗しました: ${error.message}`);
            } else {
                alert(
                    `ユーザーの検索除外の${actionText}化が完了しました。\nページをリロードします。`,
                );
                window.location.reload();
            }
        }
    }

    async function adminFreezeAccount(targetUserId) {
        const reason = prompt('アカウントの凍結理由を入力してください (必須):');
        if (reason && reason.trim()) {
            if (
                confirm(`本当にこのユーザーを凍結しますか？\n理由: ${reason}`)
            ) {
                const { error } = await supabase
                    .from('user')
                    .update({ frieze: reason.trim() })
                    .eq('id', targetUserId);
                if (error) {
                    alert(`凍結に失敗しました: ${error.message}`);
                } else {
                    alert(
                        'アカウントを凍結しました。\nページをリロードします。',
                    );
                    window.location.reload();
                }
            }
        } else {
            alert('凍結理由の入力は必須です。');
        }
    }

    // --- 12. リアルタイム更新 ---
    function subscribeToChanges() {
        if (realtimeChannel) return;
        realtimeChannel = supabase
            .channel('nyax-feed')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'post' },
                async (payload) => {
                    const mainScreenEl = document.getElementById('main-screen');

                    if (
                        currentUser &&
                        payload.new.reply_id === null &&
                        payload.new.userid !== currentUser.id &&
                        mainScreenEl &&
                        !mainScreenEl.classList.contains('hidden') &&
                        currentUser.follow?.includes(payload.new.userid)
                    ) {
                        if (document.querySelector('.new-posts-indicator'))
                            return;

                        const indicator = document.createElement('div');
                        indicator.className = 'new-posts-indicator';
                        const button = document.createElement('button');
                        button.textContent = '新しいポストを表示';
                        button.onclick = () => {
                            indicator.remove();
                            router();
                        };
                        indicator.appendChild(button);

                        const postFormStickyContainer =
                            mainScreenEl.querySelector(
                                '.post-form-sticky-container',
                            );
                        if (postFormStickyContainer) {
                            mainScreenEl.insertBefore(
                                indicator,
                                postFormStickyContainer,
                            );
                        }
                    }
                    // ポスト詳細画面で、そのポストに対する直接の返信があった場合はリロード
                    else if (
                        !document
                            .getElementById('post-detail-screen')
                            .classList.contains('hidden')
                    ) {
                        const currentPostId = window.location.hash.substring(6);
                        if (payload.new.reply_id === currentPostId) {
                            router();
                        }
                    }
                },
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'user',
                    filter: `id=eq.${currentUser?.id}`,
                },
                (payload) => {
                    updateNavAndSidebars();
                },
            )
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'dm' },
                (payload) => {
                    if (
                        !currentUser ||
                        !payload.new.member.includes(currentUser.id)
                    )
                        return;

                    const currentOpenDmId = window.location.hash.startsWith(
                        '#dm/',
                    )
                        ? window.location.hash.substring(4)
                        : null;
                    if (payload.new.id === currentOpenDmId) {
                        return;
                    }
                    updateNavAndSidebars();
                },
            )
            .subscribe();
    }

    // --- 13. 初期化処理 ---

    // アプリケーション全体のクリックイベントを処理する単一のハンドラ
    document.addEventListener('click', (e) => {
        const target = e.target;

        // --- [新規追加] Markdown用コピーボタンの処理 ---
        const copyButton = target.closest('.copy-btn');
        if (copyButton) {
            e.stopPropagation();
            const parentPre = copyButton.closest('pre');
            const parentInlineWrapper = copyButton.closest(
                '.inline-code-wrapper',
            );
            let textToCopy = '';

            if (parentPre) {
                // コードブロックの場合
                textToCopy = parentPre.querySelector('code')?.textContent || '';
            } else if (parentInlineWrapper) {
                // インラインコードの場合
                textToCopy =
                    parentInlineWrapper.querySelector('code')?.textContent ||
                    '';
            }

            if (textToCopy) {
                navigator.clipboard
                    .writeText(textToCopy)
                    .then(() => {
                        const originalContent = copyButton.innerHTML;
                        copyButton.innerHTML = 'Copied!';
                        copyButton.style.minWidth = '50px';
                        copyButton.style.textAlign = 'center';
                        setTimeout(() => {
                            copyButton.innerHTML = originalContent;
                            copyButton.style.minWidth = '';
                            copyButton.style.textAlign = '';
                        }, 1500);
                    })
                    .catch((err) => {
                        console.error('Copy failed', err);
                        copyButton.innerHTML = 'Copy failed';
                    });
            }
            return; // コピーボタン処理はここで終了
        }

        // --- 1. メニューの開閉トリガー処理 ---
        const menuButton = target.closest(
            '.post-menu-btn, .dm-message-menu-btn',
        );
        if (menuButton) {
            e.stopPropagation();

            let menuToToggle;
            if (menuButton.classList.contains('dm-message-menu-btn')) {
                menuToToggle = menuButton
                    .closest('.dm-message-container')
                    ?.querySelector('.post-menu');
            } else {
                menuToToggle = menuButton
                    .closest('.post-header')
                    ?.querySelector('.post-menu');
            }

            if (menuToToggle) {
                const isCurrentlyVisible =
                    menuToToggle.classList.contains('is-visible');

                // 開いている他のメニューをすべて閉じる
                document
                    .querySelectorAll('.post-menu.is-visible')
                    .forEach((menu) => {
                        menu.classList.remove('is-visible');
                    });

                // ターゲットが閉じていた場合のみ開く
                if (!isCurrentlyVisible) {
                    menuToToggle.classList.add('is-visible');
                }
            }
            return; // メニュー開閉処理はここで終了
        }
        // --- 2. メニューの外側がクリックされた場合の処理 ---
        if (!target.closest('.post-menu')) {
            document
                .querySelectorAll('.post-menu.is-visible')
                .forEach((menu) => {
                    menu.classList.remove('is-visible');
                });
        }

        // --- 3. メニュー内のアクションボタン処理 ---
        const dmEditBtn = target.closest('.edit-dm-msg-btn');
        if (dmEditBtn) {
            const container = dmEditBtn.closest('.dm-message-container');
            openDmEditModal(
                window.location.hash.substring(4),
                container.dataset.messageId,
            );
            return;
        }
        const dmDeleteBtn = target.closest('.delete-dm-msg-btn');
        if (dmDeleteBtn) {
            const container = dmDeleteBtn.closest('.dm-message-container');
            handleDeleteDmMessage(
                window.location.hash.substring(4),
                container.dataset.messageId,
            );
            return;
        }

        // --- 4. ポストのアクションや本体のクリック処理 ---
        const postElement = target.closest('.post');
        if (postElement) {
            const timelinePostId = postElement.dataset.postId;
            const actionTargetPostId =
                postElement.dataset.actionTargetId || timelinePostId;

            const shareButton = target.closest('.share-btn');
            if (shareButton) {
                window.copyPost(timelinePostId, shareButton);
                return;
            }

            const editButton = target.closest('.edit-btn');
            if (editButton) {
                openEditPostModal(timelinePostId);
                return;
            }

            const pinButton = target.closest('.pin-btn');
            if (pinButton) {
                window.pinPost(timelinePostId);
                return;
            }

            const deleteButton = target.closest('.delete-btn');
            if (deleteButton) {
                window.deletePost(timelinePostId);
                return;
            }

            const replyButton = target.closest('.reply-button');
            if (replyButton) {
                window.handleReplyClick(
                    actionTargetPostId,
                    replyButton.dataset.username,
                );
                return;
            }

            const likeButton = target.closest('.like-button');
            if (likeButton) {
                window.handleLike(likeButton, actionTargetPostId);
                return;
            }

            const starButton = target.closest('.star-button');
            if (starButton) {
                window.handleStar(starButton, actionTargetPostId);
                return;
            }

            const repostButton = target.closest('.repost-button');
            if (repostButton) {
                supabase
                    .from('post')
                    .select('*, user(id, name, scid, icon_data, admin, verify)')
                    .eq('id', actionTargetPostId)
                    .single()
                    .then(({ data }) => {
                        if (data) openRepostModal(data, repostButton);
                    });
                return;
            }

            const postAlertButton = target.closest('.post-mask-alert');
            if (postAlertButton) {
                window.handleShowMaskedPost(postAlertButton);
                return;
            }

            if (
                !target.closest('a') &&
                !target.closest('.post-menu-btn') &&
                !target.closest('.attachment-item')
            ) {
                window.location.hash = `#post/${actionTargetPostId}`;
                return;
            }
        }

        // --- 5. その他のグローバルなクリック処理 ---

        const notificationItem = target.closest('.notification-item');
        if (notificationItem) {
            const notificationId = notificationItem.dataset.notificationId;
            const notification = currentUser.notice.find(
                (n) => n.id === notificationId,
            );

            // 削除ボタンがクリックされた場合
            if (target.closest('.notification-delete-btn')) {
                e.stopPropagation();
                // DB関数を呼び出して通知を削除
                supabase
                    .rpc('delete_notification', {
                        target_user_id: currentUser.id,
                        notification_id_to_delete: notificationId,
                    })
                    .then(({ error }) => {
                        if (error) {
                            console.error('通知の削除に失敗:', error);
                            alert('通知の削除に失敗しました。');
                        } else {
                            // 成功したら、ローカルのデータとUIからも削除
                            currentUser.notice = currentUser.notice.filter(
                                (n) => n.id !== notificationId,
                            );
                            notificationItem.remove();
                        }
                    });
                return;
            }

            // 通知自体がクリックされた場合
            if (notification && !notification.click) {
                // DB関数を呼び出して既読化
                supabase
                    .rpc('mark_notification_as_read', {
                        target_user_id: currentUser.id,
                        notification_id_to_update: notificationId,
                    })
                    .then(({ error }) => {
                        if (error) {
                            console.error('通知の既読化に失敗:', error);
                        } else {
                            // 成功したらローカルのデータとUIも更新
                            notification.click = true;
                            notificationItem.classList.remove(
                                'notification-new',
                            );
                        }
                    });
            }
            if (notification && notification.open) {
                window.location.hash = notification.open;
            }
            return;
        }

        const timelineTab = target.closest('.timeline-tab-button');
        if (timelineTab) {
            switchTimelineTab(timelineTab.dataset.tab);
            return;
        }

        const bannerSignup = target.closest('#banner-signup-button');
        if (bannerSignup) {
            goToLoginPage();
            return;
        }

        const bannerLogin = target.closest('#banner-login-button');
        if (bannerLogin) {
            goToLoginPage();
            return;
        }
    });

    // 「再試行」ボタンのイベントリスナー
    DOM.retryConnectionBtn.addEventListener('click', () => {
        DOM.connectionErrorOverlay.classList.add('hidden'); // エラー表示を隠す
        checkSession(); // 再度セッションチェックを実行
    });

    window.addEventListener('hashchange', router);

    // 全ての準備が整った後、最後にセッションチェックを開始
    DOM.freezeOverlay.classList.add('hidden');
    DOM.connectionErrorOverlay.classList.add('hidden');
    checkSession();
});

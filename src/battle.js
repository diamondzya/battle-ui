/* Seia vs. Goblin — turn-based battle.
   Classic script (not a module) so index.html also works opened straight from disk. */
(function () {
    "use strict";

    var MAX_HP = 100;
    var MAX_MP = 50;
    var MAGIC_COST = 10;
    var POTION_HEAL = 25;
    var GOBLIN_MAX_HP = 90;
    var RUN_CHANCE = 0.5;
    var TURN_DELAY = 850; // ms the goblin "thinks" before acting

    var el = {
        arena: document.getElementById("arena"),
        enemyPanel: document.getElementById("enemy-panel"),
        enemyFx: document.getElementById("enemy-fx"),
        enemyHpNow: document.getElementById("enemy-hp-now"),
        enemyFill: document.getElementById("enemy-fill"),
        enemyGhost: document.getElementById("enemy-ghost"),
        enemyBar: document.getElementById("enemy-bar"),

        playerPanel: document.getElementById("player-panel"),
        playerFx: document.getElementById("player-fx"),
        playerHpNow: document.getElementById("player-hp-now"),
        playerMpNow: document.getElementById("player-mp-now"),
        playerFill: document.getElementById("player-fill"),
        playerGhost: document.getElementById("player-ghost"),
        playerBar: document.getElementById("player-bar"),
        playerMpFill: document.getElementById("player-mp-fill"),
        playerMpBar: document.getElementById("player-mp-bar"),

        narrator: document.getElementById("narrator"),
        log: document.getElementById("log"),
        commands: document.getElementById("commands"),
        potionCount: document.getElementById("potion-count"),
        overlay: document.getElementById("overlay"),
        overlayTitle: document.getElementById("overlay-title"),
        overlaySub: document.getElementById("overlay-sub"),
        restart: document.getElementById("restart")
    };

    var buttons = {
        attack: el.commands.querySelector('[data-action="attack"]'),
        magic: el.commands.querySelector('[data-action="magic"]'),
        item: el.commands.querySelector('[data-action="item"]'),
        run: el.commands.querySelector('[data-action="run"]')
    };

    var state;

    function reset() {
        state = {
            playerHp: MAX_HP,
            playerMp: MAX_MP,
            potions: 3,
            goblinHp: GOBLIN_MAX_HP,
            over: false,
            busy: false
        };
        el.log.innerHTML = "";
        el.overlay.classList.add("hidden");
        el.overlay.classList.remove("flex");
        el.enemyFx.innerHTML = "";
        el.playerFx.innerHTML = "";
        el.enemyPanel.classList.remove("is-hit");
        el.playerPanel.classList.remove("is-hit");

        paint();
        say("A goblin blocks your path!");
    }

    /* ---------- rendering ---------- */

    function setBar(bar, fill, ghost, value, max) {
        var pct = Math.max(0, Math.min(100, (value / max) * 100)) + "%";
        fill.style.width = pct;
        if (ghost) ghost.style.width = pct;
        bar.setAttribute("aria-valuenow", String(Math.max(0, value)));
        bar.setAttribute("aria-valuemax", String(max));
    }

    function paint() {
        el.enemyHpNow.textContent = state.goblinHp;
        el.playerHpNow.textContent = state.playerHp;
        el.playerMpNow.textContent = state.playerMp;
        el.potionCount.textContent = "×" + state.potions + " left";

        setBar(el.enemyBar, el.enemyFill, el.enemyGhost, state.goblinHp, GOBLIN_MAX_HP);
        setBar(el.playerBar, el.playerFill, el.playerGhost, state.playerHp, MAX_HP);
        setBar(el.playerMpBar, el.playerMpFill, null, state.playerMp, MAX_MP);

        el.playerBar.classList.toggle("is-critical", state.playerHp > 0 && state.playerHp <= MAX_HP * 0.25);

        // Unaffordable actions are really disabled, not just dimmed.
        var locked = state.over || state.busy;
        buttons.attack.disabled = locked;
        buttons.magic.disabled = locked || state.playerMp < MAGIC_COST;
        buttons.item.disabled = locked || state.potions <= 0 || state.playerHp >= MAX_HP;
        buttons.run.disabled = locked;
    }

    function say(text) {
        el.narrator.textContent = text;
        // Re-trigger the entrance animation.
        el.narrator.classList.remove("narrator-line");
        void el.narrator.offsetWidth;
        el.narrator.classList.add("narrator-line");
    }

    function log(text) {
        var li = document.createElement("li");
        li.textContent = "› " + text;
        el.log.insertBefore(li, el.log.firstChild);
        while (el.log.children.length > 4) el.log.removeChild(el.log.lastChild);
    }

    function floatNum(target, value, kind) {
        var layer = target === "enemy" ? el.enemyFx : el.playerFx;
        var span = document.createElement("span");
        span.className = "float-num " + kind;
        span.textContent = kind === "heal" ? "+" + value : kind === "miss" ? value : "-" + value;
        span.style.left = 38 + Math.random() * 24 + "%";
        layer.appendChild(span);
        setTimeout(function () {
            if (span.parentNode) span.parentNode.removeChild(span);
        }, 1200);
    }

    function hit(target, heavy) {
        var panel = target === "enemy" ? el.enemyPanel : el.playerPanel;
        panel.classList.remove("is-hit");
        void panel.offsetWidth;
        panel.classList.add("is-hit");
        if (heavy) {
            el.arena.classList.remove("is-hit");
            void el.arena.offsetWidth;
            el.arena.classList.add("is-hit");
        }
        setTimeout(function () {
            panel.classList.remove("is-hit");
        }, 340);
    }

    function rand(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    /* ---------- combat ---------- */

    function playerTurn(action) {
        if (state.over || state.busy) return;
        state.busy = true;
        paint();

        if (action === "attack") {
            var dmg = rand(8, 14);
            state.goblinHp = Math.max(0, state.goblinHp - dmg);
            say("Seia strikes the goblin for " + dmg + "!");
            log("Seia attacks for " + dmg + " damage.");
            floatNum("enemy", dmg, "dmg");
            hit("enemy", false);

        } else if (action === "magic") {
            var mDmg = rand(18, 26);
            state.playerMp -= MAGIC_COST;
            state.goblinHp = Math.max(0, state.goblinHp - mDmg);
            say("Seia unleashes a burst of light — " + mDmg + " damage!");
            log("Seia casts for " + mDmg + " damage. (" + MAGIC_COST + " MP)");
            floatNum("enemy", mDmg, "dmg");
            hit("enemy", true);

        } else if (action === "item") {
            var before = state.playerHp;
            state.playerHp = Math.min(MAX_HP, state.playerHp + POTION_HEAL);
            var healed = state.playerHp - before;
            state.potions -= 1;
            say("Seia drinks a potion and recovers " + healed + " HP.");
            log("Seia heals " + healed + " HP. (" + state.potions + " potions left)");
            floatNum("player", healed, "heal");

        } else if (action === "run") {
            if (Math.random() < RUN_CHANCE) {
                say("Seia slips away into the trees. You escaped!");
                log("Seia fled the battle.");
                paint();
                endBattle("Escaped", "You live to fight another day.", "text-gray-200");
                return;
            }
            say("Seia tries to run — but the goblin cuts her off!");
            log("Escape failed.");
            floatNum("player", "Blocked!", "miss");
        }

        paint();

        if (state.goblinHp <= 0) {
            setTimeout(function () {
                endBattle("Victory", "The goblin is defeated. Seia stands victorious.", "text-amber-300");
            }, 520);
            return;
        }

        setTimeout(enemyTurn, TURN_DELAY);
    }

    function enemyTurn() {
        if (state.over) return;

        var heavy = Math.random() < 0.25;
        var dmg = heavy ? rand(14, 19) : rand(8, 13);

        state.playerHp = Math.max(0, state.playerHp - dmg);
        say(heavy
            ? "The goblin lunges wildly for " + dmg + " damage!"
            : "The goblin claws at Seia for " + dmg + " damage.");
        log("Goblin " + (heavy ? "lunge" : "claw") + " for " + dmg + " damage.");
        floatNum("player", dmg, "dmg");
        hit("player", heavy);
        paint();

        if (state.playerHp <= 0) {
            setTimeout(function () {
                endBattle("Defeat", "Seia falls. The goblin cackles over her.", "text-red-400");
            }, 620);
            return;
        }

        state.busy = false;
        paint();
    }

    function endBattle(title, sub, colorClass) {
        state.over = true;
        state.busy = false;
        paint();

        el.overlayTitle.textContent = title;
        el.overlayTitle.className =
            "text-4xl sm:text-5xl font-black uppercase tracking-[0.2em] " + colorClass;
        el.overlaySub.textContent = sub;

        el.overlay.classList.remove("hidden");
        el.overlay.classList.add("flex");
        el.restart.focus();
    }

    /* ---------- wiring ---------- */

    el.commands.addEventListener("click", function (e) {
        var btn = e.target.closest("button[data-action]");
        if (btn) playerTurn(btn.dataset.action);
    });

    el.restart.addEventListener("click", reset);

    reset();
})();

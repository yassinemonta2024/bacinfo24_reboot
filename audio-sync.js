(function () {
    var STORAGE_KEY = "bacinfo24-soundtrack-state";
    var TRACK_SRC = "source/music2.mp3";
    var SAVE_RATE_MS = 400;
    var audio = new Audio(TRACK_SRC);
    var unlockBound = false;
    var started = false;

    audio.preload = "auto";
    audio.loop = true;
    audio.volume = 0.9;
    audio.setAttribute("aria-hidden", "true");

    function readState() {
        try {
            var raw = sessionStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : {};
        } catch (_error) {
            return {};
        }
    }

    function writeState() {
        try {
            sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
                currentTime: audio.currentTime || 0,
                savedAt: Date.now(),
                wasPlaying: !audio.paused
            }));
        } catch (_error) {
            // Ignore storage failures.
        }
    }

    function normalizeTime(time, duration) {
        if (!duration || !isFinite(duration) || duration <= 0) {
            return Math.max(0, time || 0);
        }

        var wrapped = time % duration;
        return wrapped < 0 ? wrapped + duration : wrapped;
    }

    function restoreTime() {
        var state = readState();
        var resumeAt = Number(state.currentTime) || 0;

        if (state.wasPlaying !== false && state.savedAt) {
            resumeAt += Math.max(0, (Date.now() - Number(state.savedAt)) / 1000);
        }

        audio.currentTime = normalizeTime(resumeAt, audio.duration);
    }

    function bindUnlock() {
        if (unlockBound) {
            return;
        }

        unlockBound = true;

        var unlock = function () {
            startPlayback();
            document.removeEventListener("pointerdown", unlock);
            document.removeEventListener("keydown", unlock);
            document.removeEventListener("touchstart", unlock);
        };

        document.addEventListener("pointerdown", unlock, { once: true });
        document.addEventListener("keydown", unlock, { once: true });
        document.addEventListener("touchstart", unlock, { once: true });
    }

    function startPlayback() {
        if (started) {
            return;
        }

        started = true;

        var playAttempt = audio.play();
        if (playAttempt && typeof playAttempt.catch === "function") {
            playAttempt.catch(function () {
                started = false;
                bindUnlock();
            });
        }
    }

    function initTrack() {
        restoreTime();
        startPlayback();
    }

    if (audio.readyState >= 1) {
        initTrack();
    } else {
        audio.addEventListener("loadedmetadata", initTrack, { once: true });
    }

    setInterval(function () {
        if (!audio.paused) {
            writeState();
        }
    }, SAVE_RATE_MS);

    window.addEventListener("pagehide", writeState);
    window.addEventListener("beforeunload", writeState);

    document.addEventListener("visibilitychange", function () {
        if (document.visibilityState === "hidden") {
            writeState();
        }
    });
})();

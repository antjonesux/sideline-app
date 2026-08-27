(() => {
  const els = {
    playbook: document.getElementById("playbook-label"),
    modeBadge: document.getElementById("mode-badge"),
    reviewed: document.getElementById("stat-reviewed"),
    avg: document.getElementById("stat-avg"),
    eta: document.getElementById("stat-eta"),
    owned: document.getElementById("owned-img"),
    formation: document.getElementById("formation-label"),
    transferBanner: document.getElementById("transfer-banner"),
    matcherHint: document.getElementById("matcher-hint"),
    reason: document.getElementById("reason-label"),
    candidates: document.getElementById("candidates"),
    hints: document.getElementById("hints"),
    toast: document.getElementById("toast"),
    flash: document.getElementById("flash"),
    picker: document.getElementById("picker"),
    pickerInput: document.getElementById("picker-input"),
    pickerList: document.getElementById("picker-list"),
    notePrompt: document.getElementById("note-prompt"),
    noteInput: document.getElementById("note-input"),
    done: document.getElementById("done"),
    doneCopy: document.getElementById("done-copy"),
    main: document.getElementById("main"),
    explainer: document.getElementById("diag-explainer"),
    explainerDismiss: document.getElementById("diag-explainer-dismiss"),
  };

  let mode = "review";
  let current = null;
  let busy = false;
  let pickerOpen = false;
  let noteOpen = false;
  let pickerItems = [];
  let pickerIndex = 0;

  const REVIEW_HINTS = `
    <span><kbd>1</kbd>/<kbd>2</kbd>/<kbd>3</kbd> confirm</span>
    <span><kbd>Enter</kbd>/<kbd>Space</kbd>/<kbd>→</kbd> confirm ★</span>
    <span><kbd>S</kbd> skip</span>
    <span><kbd>D</kbd> vault duplicate</span>
    <span><kbd>N</kbd> none of these</span>
    <span><kbd>←</kbd> undo</span>
    <span><kbd>Q</kbd> quit</span>
  `;

  const DIAG_HINTS = `
    <span><kbd>F</kbd> formation mismatch</span>
    <span><kbd>C</kbd> correct formation, wrong top 3</span>
    <span><kbd>A</kbd> ambiguous / can't tell</span>
    <span><kbd>O</kbd> other</span>
    <span><kbd>←</kbd> undo</span>
    <span><kbd>Q</kbd> save &amp; quit</span>
  `;

  function fmtMs(ms) {
    if (ms == null || Number.isNaN(ms)) return "—";
    if (ms < 1000) return `${Math.round(ms)}ms`;
    const s = ms / 1000;
    if (s < 60) return `~${s.toFixed(1)}s`;
    return `~${Math.round(s / 60)}m`;
  }

  function showToast(message, kind = "ok") {
    els.toast.hidden = false;
    els.toast.className = `toast ${kind}`;
    els.toast.textContent = message;
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => {
      els.toast.hidden = true;
    }, 1800);
  }

  function flashConfirm() {
    els.flash.hidden = false;
    clearTimeout(flashConfirm._t);
    flashConfirm._t = setTimeout(() => {
      els.flash.hidden = true;
    }, 160);
  }

  function applyMode(nextMode) {
    mode = nextMode === "diagnostic" ? "diagnostic" : "review";
    document.body.classList.toggle("diagnostic", mode === "diagnostic");
    document.title =
      mode === "diagnostic" ? "Play-Art Skip Diagnostic" : "Play-Art REVIEW";
    els.modeBadge.hidden = mode !== "diagnostic";
    els.hints.innerHTML = mode === "diagnostic" ? DIAG_HINTS : REVIEW_HINTS;
    els.matcherHint.hidden = mode !== "diagnostic";
    if (mode === "diagnostic") {
      const dismissed = sessionStorage.getItem("diag-explainer-dismissed") === "1";
      els.explainer.hidden = dismissed;
    } else {
      els.explainer.hidden = true;
    }
  }

  function updateProgress(progress, playbook) {
    if (playbook) {
      els.playbook.textContent =
        mode === "diagnostic"
          ? `Playbook: ${playbook}`
          : `Playbook: ${playbook}`;
    }
    if (!progress) return;

    if (mode === "diagnostic" || progress.mode === "diagnostic") {
      const total = progress.total ?? 0;
      const categorized = progress.categorized ?? 0;
      els.reviewed.textContent = `${categorized} / ${total} categorized`;
      els.avg.textContent =
        progress.totalSkippedInState != null
          ? `${progress.totalSkippedInState} skipped in state`
          : "";
      const s = progress.summary;
      els.eta.textContent = s
        ? `F:${s.F_formationMismatch} C:${s.C_correctFormationWrongTop3} A:${s.A_ambiguous} O:${s.O_other}`
        : "—";
      return;
    }

    els.reviewed.textContent = `${progress.reviewed} / ${progress.total} reviewed`;
    els.avg.textContent =
      progress.avgTimeMs != null ? `${fmtMs(progress.avgTimeMs)} avg` : "— avg";
    els.eta.textContent =
      progress.estimatedRemainingMs != null
        ? `${fmtMs(progress.estimatedRemainingMs)} remaining`
        : "— remaining";
  }

  function refSrc(url) {
    if (!url) return "";
    return `/refs/?url=${encodeURIComponent(url)}`;
  }

  function scoreLine(c) {
    const bits = [];
    if (c.v3Score != null) bits.push(`V3: ${c.v3Score.toFixed(3)}`);
    if (c.geometryScore != null) bits.push(`Geo: ${c.geometryScore.toFixed(3)}`);
    if (c.perHueMargin != null) bits.push(`HueΔ: ${c.perHueMargin.toFixed(3)}`);
    return bits.join(" · ") || "scores n/a";
  }

  function renderCandidates(candidates) {
    els.candidates.innerHTML = "";
    candidates.forEach((c, i) => {
      const card = document.createElement("article");
      card.className = `candidate${c.isAssigned ? " assigned" : ""}`;
      const head = document.createElement("div");
      head.className = "candidate-head";
      head.innerHTML = `<span><span class="num">${i + 1}</span> ${escapeHtml(
        c.playName,
      )}${c.isAssigned ? '<span class="star">★</span>' : ""}</span>`;
      card.appendChild(head);

      if (c.referenceUrl) {
        const img = document.createElement("img");
        img.alt = c.playName;
        img.loading = "eager";
        img.src = refSrc(c.referenceUrl);
        img.onerror = () => {
          const ph = document.createElement("div");
          ph.className = "img-fallback";
          ph.textContent = "ref unavailable";
          img.replaceWith(ph);
        };
        card.appendChild(img);
      } else {
        const ph = document.createElement("div");
        ph.className = "img-fallback";
        ph.textContent = "no URL";
        card.appendChild(ph);
      }

      const scores = document.createElement("div");
      scores.className = "scores";
      scores.textContent = scoreLine(c);
      card.appendChild(scores);
      els.candidates.appendChild(card);
    });
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function renderCase(reviewCase) {
    current = reviewCase;
    els.main.hidden = false;
    els.done.hidden = true;
    if (mode === "diagnostic") {
      els.formation.innerHTML = `Matcher assigned: <span class="matcher-assigned">${escapeHtml(
        reviewCase.formation,
      )}</span>`;
      const skipBit = reviewCase.originalSkipReason
        ? ` — skip: ${reviewCase.originalSkipReason}`
        : "";
      els.reason.textContent = `${reviewCase.cropId}${skipBit}`;
      if (els.transferBanner) els.transferBanner.hidden = true;
    } else {
      els.formation.textContent = reviewCase.formation;
      els.reason.textContent = `${reviewCase.cropId} — ${reviewCase.reviewReason}`;
      if (els.transferBanner) {
        if (reviewCase.lockedPlay) {
          els.transferBanner.hidden = false;
          els.transferBanner.textContent = `Different crop than your last match. "${reviewCase.lockedPlay.playName}" stays on ${reviewCase.lockedPlay.ownerCropId}. If this crop is the same printed play, press D (vault duplicate). Otherwise pick a different play (← undoes that assignment).`;
        } else {
          els.transferBanner.hidden = true;
          els.transferBanner.textContent = "";
        }
      }
    }
    els.owned.src = reviewCase.cropPath;
    els.owned.onerror = () => {
      showToast("Owned crop failed to load", "error");
    };
    renderCandidates(reviewCase.candidates || []);
  }

  function showDone(progress) {
    current = null;
    els.main.hidden = true;
    els.done.hidden = false;
    if (mode === "diagnostic") {
      const s = progress?.summary;
      els.doneCopy.textContent = s
        ? `Categorized ${progress.categorized ?? 0} of ${progress.total ?? 0}. F:${s.F_formationMismatch} C:${s.C_correctFormationWrongTop3} A:${s.A_ambiguous} O:${s.O_other}. Summary printed in the terminal.`
        : `Categorized ${progress?.categorized ?? 0}. Summary printed in the terminal.`;
    } else {
      els.doneCopy.textContent = `Reviewed ${progress?.reviewed ?? 0}, skipped ${
        progress?.skipped ?? 0
      }.`;
    }
  }

  async function api(path, options) {
    const res = await fetch(path, {
      headers: { "Content-Type": "application/json" },
      ...options,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.ok === false) {
      throw new Error(data.error || `HTTP ${res.status}`);
    }
    return data;
  }

  function preloadImages(cases) {
    for (const c of cases || []) {
      const img = new Image();
      img.src = c.cropPath;
      for (const cand of c.candidates || []) {
        if (!cand.referenceUrl) continue;
        const r = new Image();
        r.src = refSrc(cand.referenceUrl);
      }
    }
  }

  async function loadNext() {
    const data = await api("/api/next");
    if (data.mode) applyMode(data.mode);
    updateProgress(data.progress, data.playbook);
    if (data.done || !data.case) {
      showDone(data.progress);
      return;
    }
    renderCase(data.case);
    const peek = await api("/api/peek?n=3").catch(() => null);
    if (peek?.cases) preloadImages(peek.cases);
  }

  async function confirmPlay(playName) {
    if (mode === "diagnostic" || !current || busy || pickerOpen || noteOpen) return;
    busy = true;
    try {
      const data = await api("/api/confirm", {
        method: "POST",
        body: JSON.stringify({
          caseKey: current.caseKey,
          playName,
        }),
      });
      flashConfirm();
      updateProgress(data.progress);
      if (data.requeuedDisplaced) {
        showToast(
          `Saved "${playName}". A different crop that had that name is still in queue — assign its real play next.`,
        );
      }
      await loadNext();
    } catch (err) {
      showToast(err.message || String(err), "error");
    } finally {
      busy = false;
    }
  }

  function assignedPlay() {
    const hit = (current?.candidates || []).find((c) => c.isAssigned);
    return hit?.playName || current?.candidates?.[0]?.playName;
  }

  async function confirmIndex(index) {
    const c = current?.candidates?.[index];
    if (!c) return;
    await confirmPlay(c.playName);
  }

  async function omitDuplicate() {
    if (mode === "diagnostic" || !current || busy || pickerOpen || noteOpen) return;
    if (!current.lockedPlay) {
      showToast(
        "D works after a transfer: this crop must be the duplicate of a play already kept on another crop.",
        "error",
      );
      return;
    }
    busy = true;
    try {
      const data = await api("/api/omit-duplicate", {
        method: "POST",
        body: JSON.stringify({ caseKey: current.caseKey }),
      });
      flashConfirm();
      updateProgress(data.progress);
      showToast(
        `Omitted vault duplicate of "${data.duplicateOf}" (kept on ${data.keptCropId})`,
      );
      await loadNext();
    } catch (err) {
      showToast(err.message || String(err), "error");
    } finally {
      busy = false;
    }
  }

  async function skip(reason) {
    if (mode === "diagnostic" || !current || busy || pickerOpen || noteOpen) return;
    busy = true;
    try {
      const data = await api("/api/skip", {
        method: "POST",
        body: JSON.stringify({ caseKey: current.caseKey, reason }),
      });
      updateProgress(data.progress);
      await loadNext();
    } catch (err) {
      showToast(err.message || String(err), "error");
    } finally {
      busy = false;
    }
  }

  async function categorize(category, notes) {
    if (mode !== "diagnostic" || !current || busy || pickerOpen || noteOpen) return;
    busy = true;
    try {
      const data = await api("/api/categorize", {
        method: "POST",
        body: JSON.stringify({
          caseKey: current.caseKey,
          category,
          notes: notes || "",
        }),
      });
      flashConfirm();
      updateProgress(data.progress);
      showToast(`Logged ${category}`);
      if (data.done) {
        showDone(data.progress);
      } else {
        await loadNext();
      }
    } catch (err) {
      showToast(err.message || String(err), "error");
    } finally {
      busy = false;
    }
  }

  function openNotePrompt() {
    if (!current || mode !== "diagnostic") return;
    noteOpen = true;
    els.notePrompt.hidden = false;
    els.noteInput.value = "";
    els.noteInput.focus();
  }

  function closeNotePrompt() {
    noteOpen = false;
    els.notePrompt.hidden = true;
  }

  async function undo() {
    if (busy || pickerOpen || noteOpen) return;
    busy = true;
    try {
      const data = await api("/api/undo", { method: "POST", body: "{}" });
      updateProgress(data.progress);
      if (data.case) renderCase(data.case);
      else await loadNext();
      showToast("Undone");
    } catch (err) {
      showToast(err.message || String(err), "error");
    } finally {
      busy = false;
    }
  }

  async function quit() {
    try {
      await api("/api/quit", { method: "POST", body: "{}" });
    } catch {
      /* server may already be closing */
    }
    showToast(
      mode === "diagnostic"
        ? "Report saved. You can close this tab."
        : "Saved. You can close this tab.",
    );
  }

  function openPicker() {
    if (!current || mode === "diagnostic") return;
    pickerOpen = true;
    pickerItems = [...(current.formationPlays || [])];
    pickerIndex = 0;
    els.picker.hidden = false;
    els.pickerInput.value = "";
    renderPickerList();
    els.pickerInput.focus();
  }

  function closePicker() {
    pickerOpen = false;
    els.picker.hidden = true;
  }

  function filteredPlays() {
    const q = els.pickerInput.value.trim().toLowerCase();
    if (!q) return pickerItems;
    return pickerItems.filter((p) => p.toLowerCase().includes(q));
  }

  function renderPickerList() {
    const items = filteredPlays();
    if (pickerIndex >= items.length) pickerIndex = Math.max(0, items.length - 1);
    els.pickerList.innerHTML = "";
    items.forEach((play, i) => {
      const li = document.createElement("li");
      li.textContent = play;
      if (i === pickerIndex) li.className = "active";
      li.addEventListener("mousedown", (e) => {
        e.preventDefault();
        pickerIndex = i;
        void confirmFromPicker();
      });
      els.pickerList.appendChild(li);
    });
  }

  async function confirmFromPicker() {
    const items = filteredPlays();
    const play = items[pickerIndex];
    if (!play) return;
    closePicker();
    await confirmPlay(play);
  }

  els.pickerInput.addEventListener("input", () => {
    pickerIndex = 0;
    renderPickerList();
  });

  els.explainerDismiss?.addEventListener("click", () => {
    els.explainer.hidden = true;
    sessionStorage.setItem("diag-explainer-dismissed", "1");
  });

  window.addEventListener("keydown", (e) => {
    if (noteOpen) {
      if (e.key === "Escape") {
        e.preventDefault();
        closeNotePrompt();
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        const notes = els.noteInput.value.trim();
        closeNotePrompt();
        void categorize("O", notes);
      }
      return;
    }

    if (pickerOpen) {
      if (e.key === "Escape") {
        e.preventDefault();
        closePicker();
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        pickerIndex += 1;
        renderPickerList();
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        pickerIndex = Math.max(0, pickerIndex - 1);
        renderPickerList();
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        void confirmFromPicker();
        return;
      }
      return;
    }

    if (busy) return;
    const key = e.key;

    if (mode === "diagnostic") {
      if (key === "f" || key === "F") {
        e.preventDefault();
        void categorize("F");
      } else if (key === "c" || key === "C") {
        e.preventDefault();
        void categorize("C");
      } else if (key === "a" || key === "A") {
        e.preventDefault();
        void categorize("A");
      } else if (key === "o" || key === "O") {
        e.preventDefault();
        openNotePrompt();
      } else if (key === "ArrowLeft") {
        e.preventDefault();
        void undo();
      } else if (key === "q" || key === "Q") {
        e.preventDefault();
        void quit();
      }
      return;
    }

    if (key === "1") {
      e.preventDefault();
      void confirmIndex(0);
    } else if (key === "2") {
      e.preventDefault();
      void confirmIndex(1);
    } else if (key === "3") {
      e.preventDefault();
      void confirmIndex(2);
    } else if (key === "Enter" || key === " " || key === "ArrowRight") {
      e.preventDefault();
      const play = assignedPlay();
      if (play) void confirmPlay(play);
    } else if (key === "s" || key === "S") {
      e.preventDefault();
      void skip("skipped");
    } else if (key === "d" || key === "D") {
      e.preventDefault();
      void omitDuplicate();
    } else if (key === "n" || key === "N") {
      e.preventDefault();
      openPicker();
    } else if (key === "ArrowLeft") {
      e.preventDefault();
      void undo();
    } else if (key === "q" || key === "Q") {
      e.preventDefault();
      void quit();
    }
  });

  api("/api/progress")
    .then((progress) => {
      applyMode(progress.mode || "review");
      updateProgress(progress, progress.playbook);
    })
    .catch(() => {
      applyMode("review");
    })
    .finally(() => {
      loadNext().catch((err) => {
        showToast(err.message || String(err), "error");
      });
    });
})();

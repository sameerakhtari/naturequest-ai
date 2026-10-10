"use strict";

/* No analytics, trackers, external APIs, or hosted inference. */
const $ = (selector) => document.querySelector(selector);
const state = {modelReady: false, photo: null, previewURL: null, analysis: null, activeMission: null};
const toast = $("#toast");
let toastTimer;

function notice(message) {
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {toast.hidden = true;}, 4800);
}
function escapeHTML(value) {
  return String(value == null ? "" : value).replace(/[&<>"']/g, function (char) {
    return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char];
  });
}
async function api(url, options) {
  const response = await fetch(url, Object.assign({cache:"no-store"}, options || {}));
  let data;
  try {data = await response.json();} catch (_) {data = {};}
  if (!response.ok) {
    const detail = typeof data.detail === "string" ? data.detail : "Please try again.";
    throw new Error(detail);
  }
  return data;
}
async function checkModel() {
  const pill = $("#model-pill");
  try {
    const data = await api("/api/status");
    state.modelReady = !!data.ready;
    pill.classList.toggle("ready", state.modelReady);
    $("#model-status").textContent = state.modelReady ? "Gemma ready · local" :
      data.online ? "Pull Gemma to enable AI" : "Offline field mode";
  } catch (_) {
    state.modelReady = false;
    pill.classList.remove("ready");
    $("#model-status").textContent = "Offline field mode";
  }
  $("#analyze-button").disabled = !(state.modelReady && state.photo);
}

const curatedSteps = {
  curious: ["Find three different leaf shapes and compare them.",
    "Watch a small living thing from a respectful distance for a minute.",
    "Photograph one detail you would usually pass by."],
  calm: ["Listen quietly for a minute and count layers of sound.",
    "Find three different natural textures without disturbing them.",
    "Notice how wind or light changes in one spot."],
  active: ["Walk briskly for five minutes, then slow down and look closer.",
    "Notice three different places where plants are growing.",
    "Return by a new route and spot one landscape change."],
  creative: ["Find a repeating pattern in the natural world.",
    "Photograph an unexpected close-up composition.",
    "Give the scene a three-word title without picking anything."]
};
const curatedPlaces = {
  park: ["A pocket safari", "A nearby park becomes a tiny wilderness."],
  backyard: ["Your miniature wild", "Discover life just outside your door."],
  city: ["Nature between buildings", "Find life making room in the city."],
  trail: ["The slow trail", "Explore a familiar path with unfamiliar eyes."],
  coast: ["At the water's edge", "Watch land, water, and wildlife meet."]
};
function offlineMission(data) {
  const place = curatedPlaces[data.place] || curatedPlaces.park;
  return {title:place[0], subtitle:place[1], steps:curatedSteps[data.mood] || curatedSteps.curious,
    minutes:data.minutes, source:"curated", closing:"Put your phone away. The best part happens out there."};
}
function renderMission(mission) {
  state.activeMission = mission;
  const label = mission.source === "gemma3" ? "GEMMA-GENERATED" : "OFFLINE FIELD GUIDE";
  $("#mission-result").className = "mission-card";
  $("#mission-result").innerHTML =
    '<div class="mission-kicker"><span>✳ YOUR FIELD CARD</span><span>' + label + '</span></div>' +
    '<h3>' + escapeHTML(mission.title) + '</h3><p>' + escapeHTML(mission.subtitle) + '</p>' +
    '<ol class="mission-list">' +
    mission.steps.map(function (step, index) {
      return '<li><label><input type="checkbox" class="step-check" data-step="' + index +
        '"><span>' + escapeHTML(step) + '</span></label></li>';
    }).join("") + '</ol>' +
    '<p><em>' + escapeHTML(mission.closing) + '</em></p>' +
    '<div class="mission-bottom"><small>◷ ' + Number(mission.minutes) +
    ' min · All discoveries welcome</small><button type="button" class="btn btn-dark" id="finish-mission" disabled>Log adventure ↗</button></div>';
  $("#mission-result").querySelectorAll(".step-check").forEach(function (box) {
    box.addEventListener("change", updateMissionCompletion);
  });
  $("#finish-mission").addEventListener("click", finishMission);
}
function updateMissionCompletion() {
  const boxes = Array.from($("#mission-result").querySelectorAll(".step-check"));
  $("#finish-mission").disabled = !boxes.every(function (box) {return box.checked;});
}
async function finishMission() {
  if (!state.activeMission || $("#finish-mission").disabled) return;
  const mission = state.activeMission;
  try {
    await storeEntry({type:"adventure", title:mission.title, note:mission.subtitle +
      "\n\n" + mission.steps.join("\n"), photo:null});
    notice("Adventure logged! The real reward was getting outside.");
    $("#finish-mission").disabled = true;
    $("#finish-mission").textContent = "Adventure logged ✓";
    await showJournal();
  } catch (_) {notice("Unable to save. Make sure browser storage is enabled.");}
}
$("#mission-form").addEventListener("submit", async function (event) {
  event.preventDefault();
  const button = $("#mission-submit");
  const fields = new FormData(event.currentTarget);
  const request = {
    place:String(fields.get("place") || "park"),
    mood:String(fields.get("mood") || "curious"),
    minutes:Number(fields.get("minutes") || 20)
  };
  button.disabled = true;
  button.textContent = "Finding a little magic…";
  let result;
  try {result = await api("/api/mission", {
    method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(request)
  });}
  catch (_) {result = offlineMission(request);}
  renderMission(result);
  button.disabled = false;
  button.innerHTML = 'Make another adventure <span aria-hidden="true">↗</span>';
  $("#mission-result").scrollIntoView({behavior:"smooth",block:"center"});
});

const photoInput = $("#photo-input");
photoInput.addEventListener("change", function () {
  const selected = photoInput.files && photoInput.files[0];
  if (state.previewURL) URL.revokeObjectURL(state.previewURL);
  state.previewURL = null;
  state.photo = null;
  state.analysis = null;
  $("#analysis-result").hidden = true;
  $("#image-preview").hidden = true;
  $("#upload-visual").hidden = false;
  $("#save-photo-button").disabled = true;
  $("#analyze-button").disabled = true;
  if (!selected) return;
  if (!["image/jpeg","image/png","image/webp"].includes(selected.type)) {
    notice("Please select a JPEG, PNG, or WebP image."); photoInput.value = ""; return;
  }
  if (!selected.size || selected.size > 8 * 1024 * 1024) {
    notice("The photo must be smaller than 8 MB."); photoInput.value = ""; return;
  }
  state.photo = selected;
  state.previewURL = URL.createObjectURL(selected);
  $("#image-preview").src = state.previewURL;
  $("#image-preview").hidden = false;
  $("#upload-visual").hidden = true;
  $("#save-photo-button").disabled = false;
  $("#analyze-button").disabled = !state.modelReady;
  if (!state.modelReady) notice("Your photo can be saved now. Start local Ollama to enable AI analysis.");
});
$("#analyze-button").addEventListener("click", async function () {
  if (!state.photo || !state.modelReady) return;
  const button = this;
  button.disabled = true;
  button.textContent = "Observing with Gemma…";
  const form = new FormData();
  form.append("photo", state.photo, state.photo.name);
  try {
    const answer = await api("/api/observe", {method:"POST",body:form});
    state.analysis = answer;
    $("#analysis-result").hidden = false;
    $("#analysis-result").innerHTML =
      '<p class="mini-label">✳ LOCAL GEMMA OBSERVATION</p><h4>' + escapeHTML(answer.title) + '</h4>' +
      '<p>' + escapeHTML(answer.observation) + '</p>' +
      '<p><strong>LOOK FOR NEXT</strong><br>' + escapeHTML(answer.look_for) + '</p>' +
      '<p class="fineprint"><strong>UNCERTAINTY:</strong> ' + escapeHTML(answer.uncertainty) + '</p>' +
      '<p class="fineprint"><strong>CARE:</strong> ' + escapeHTML(answer.safety) + '</p>';
    notice("Observation complete. Save this moment to your journal!");
  } catch (error) {
    notice(error.message);
    await checkModel();
  } finally {
    button.textContent = "Ask local AI ✳";
    button.disabled = !(state.photo && state.modelReady);
  }
});

function compressedPhoto(file) {
  return new Promise(function (resolve, reject) {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = function () {
      try {
        const scale = Math.min(1, 900 / Math.max(img.naturalWidth, img.naturalHeight));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.72));
      } catch (e) {reject(e);} finally {URL.revokeObjectURL(url);}
    };
    img.onerror = function () {URL.revokeObjectURL(url);reject(new Error("Image could not be loaded."));};
    img.src = url;
  });
}
$("#save-photo-button").addEventListener("click", async function () {
  if (!state.photo) return;
  const button = this;
  button.disabled = true;
  button.textContent = "Saving…";
  try {
    const image = await compressedPhoto(state.photo);
    const note = $("#photo-note").value.trim();
    const summary = state.analysis ? state.analysis.observation : "";
    await storeEntry({
      type:"observation", title:state.analysis ? state.analysis.title : "A little discovery",
      note:[note,summary].filter(Boolean).join("\n\n"), photo:image,
      lookFor:state.analysis ? state.analysis.look_for : "",
      model:state.analysis ? state.analysis.model : ""
    });
    notice("Moment safely tucked into your private field journal.");
    await showJournal();
    $("#journal").scrollIntoView({behavior:"smooth",block:"start"});
  } catch (error) {notice("Could not save this photo: " + error.message);}
  finally {button.disabled = false; button.textContent = "Save to journal ↗";}
});

function database() {
  return new Promise(function (resolve, reject) {
    const request = indexedDB.open("naturequest-field-journal", 1);
    request.onupgradeneeded = function () {
      const db = request.result;
      if (!db.objectStoreNames.contains("entries")) db.createObjectStore("entries", {keyPath:"id"});
    };
    request.onsuccess = function () {resolve(request.result);};
    request.onerror = function () {reject(request.error);};
  });
}
async function operate(mode, run) {
  const db = await database();
  return new Promise(function (resolve, reject) {
    const transaction = db.transaction("entries", mode);
    const request = run(transaction.objectStore("entries"));
    request.onsuccess = function () {resolve(request.result);};
    request.onerror = function () {reject(request.error);};
    transaction.oncomplete = function () {db.close();};
    transaction.onerror = function () {reject(transaction.error);db.close();};
  });
}
function storeEntry(entry) {
  const id = String(Date.now()) + "-" + Math.random().toString(36).slice(2);
  return operate("readwrite", function (store) {return store.put(Object.assign({
    id:id, createdAt:new Date().toISOString()
  }, entry));});
}
function getEntries() {return operate("readonly", function (store) {return store.getAll();});}
function removeEntry(id) {return operate("readwrite", function (store) {return store.delete(id);});}
async function showJournal() {
  const grid = $("#journal-grid");
  try {
    const entries = (await getEntries()).sort(function (a,b) {return b.createdAt.localeCompare(a.createdAt);});
    $("#journal-count").textContent = String(entries.length);
    if (!entries.length) {
      grid.innerHTML = '<div class="empty-journal"><span>✳</span><h3>Nothing here yet. How exciting.</h3>' +
        '<p>Every great field journal starts with one small adventure.<br>Head outside and bring a moment back.</p>' +
        '<a class="btn btn-dark" href="#plan">Plan my first adventure ↗</a></div>';
      return;
    }
    grid.innerHTML = "";
    entries.forEach(function (entry) {
      const card = document.createElement("article");
      card.className = "journal-card";
      const image = entry.photo && /^data:image\/jpeg;base64,/.test(entry.photo)
        ? '<img class="journal-photo" alt="Field journal photograph" src="' + entry.photo + '">'
        : '<div class="journal-no-photo" aria-hidden="true">✳</div>';
      const date = new Date(entry.createdAt);
      const dateText = isNaN(date.getTime()) ? "Undated" : date.toLocaleDateString(undefined, {
        day:"numeric",month:"short",year:"numeric"
      });
      card.innerHTML = image + '<div class="journal-content"><time>' + escapeHTML(dateText) +
        '</time><h3>' + escapeHTML(entry.title || "A little discovery") + '</h3><p>' +
        escapeHTML(entry.note || "A moment worth remembering.") + '</p>' +
        (entry.lookFor ? '<p><strong>Next curiosity:</strong> ' + escapeHTML(entry.lookFor) + '</p>' : '') +
        '<div class="journal-actions"><span>' + (entry.type === "adventure" ? "✳ Completed adventure" :
        entry.model ? "✳ Gemma observation" : "◎ Personal observation") +
        '</span><button type="button">Delete</button></div></div>';
      card.querySelector("button").addEventListener("click", async function () {
        if (!confirm("Delete this journal entry? This cannot be undone.")) return;
        try {await removeEntry(entry.id);await showJournal();notice("Entry deleted.");}
        catch (_) {notice("Unable to delete entry.");}
      });
      grid.appendChild(card);
    });
  } catch (_) {
    grid.innerHTML = '<p>Browser storage is disabled. Allow IndexedDB to keep a private journal.</p>';
  }
}
$("#export-button").addEventListener("click", async function () {
  try {
    const entries = await getEntries();
    if (!entries.length) {notice("Your field journal is empty.");return;}
    const blob = new Blob([JSON.stringify({
      app:"NatureQuest", version:1, exportedAt:new Date().toISOString(), entries:entries
    },null,2)], {type:"application/json"});
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "naturequest-journal.json";
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(function () {URL.revokeObjectURL(url);}, 1000);
    notice("Journal exported to your downloads.");
  } catch (_) {notice("Unable to export. Check browser storage permissions.");}
});

checkModel();
showJournal();
setInterval(checkModel, 45000);
if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost" || location.hostname === "127.0.0.1")) {
  window.addEventListener("load", function () {
    navigator.serviceWorker.register("/sw.js").catch(function () {});
  });
}

let route = "aabmcb"; // change as needed

const JSON_DIR = "./json";
const INFO_FILE = `${JSON_DIR}/journal-info.json`;
const METRICS_FILE = `${JSON_DIR}/journal_metrics.json`;
const RELATED_JOURNALS = `${JSON_DIR}/relatedJournals.json`;

const MASTHEAD_BASE =
  "https://raw.githubusercontent.com/DSCO-Support/JournalMastheads/refs/heads/main/mastheads";

// --- Fetch helper ---
async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok)
    throw new Error(`Failed to load ${url}: ${res.status} ${res.statusText}`);
  return res.json();
}

function getJournalInfo(infoJson, code) {
  const root = infoJson.journalInfo ?? infoJson;
  return root?.journal?.[code] ?? null;
}
function getJournalMetrics(metricsJson, code) {
  const root = metricsJson.journal_metrics ?? metricsJson;
  return root?.journal?.[code] ?? null;
}

function getEditorInfo(info) {
  return info?.editorInfo ?? info?.editor ?? null;
}

function formatPercent(x) {
  return typeof x === "number" ? `${Math.round(x * 100)}%` : "—";
}

function showOnly(sectionId) {
  document.querySelectorAll(".page").forEach((sec) => {
    sec.classList.toggle("active", sec.id === sectionId);
  });
}

function buildAffiliation(person) {
  const parts = [];

  const aff =
    person?.["Affiliation"] ||
    person?.["Institution"] ||
    person?.["Organization"] ||
    "";

  const country = person?.["Country"] || person?.["Location"] || "";

  if (aff) parts.push(aff);
  if (country) parts.push(country);

  return parts.filter(Boolean).join("<br>");
}

function updateEditorInfo(person, editorInfo, role) {
  const map = {
    "Editor-in-Chief": {
      mainNameId: "mainSectionEditorName",
      sideContainerId: "editor-in-chief",
      sideNameId: "sideSectionEditorName",
      sideProfileImageId: "editorInChiefProfileIcon",
      sideInstitutionName: "chiefUnivName",
      sideCountryName:"chiefCountry"
    },
    "Deputy Editor": {
      mainNameId: "mainSectionDeputyName",
      sideContainerId: "deputy-editor",
      sideNameId: "sideSectionDeputyName",
      sideProfileImageId: "deputyEditorProfileIcon",
      sideInstitutionName: "deputyUnivName",
      sideCountryName:"deputyCountry"
    },
  };

  const cfg = map[role];
  if (!cfg) return;

  const name =
    person?.["Display Name"] ||
    [person?.["First Name"], person?.["Last Name"]].filter(Boolean).join(" ") ||
    person?.["Name"] ||
    person?.name ||
    "";

  const infoOverride =
    (editorInfo &&
      editorInfo[role] &&
      (editorInfo[role].image || editorInfo[role].photo)) ||
    (editorInfo && (editorInfo.image || editorInfo.photo)) ||
    null;

  const mastheadImage =
    person?.["Portrait"] || person?.["Photo"] || person?.["Image"] || null;

  const imgSrc = infoOverride || mastheadImage || null;

  const affHTML = buildAffiliation(person);

  setText(cfg.mainNameId, name || "—");
  setText(cfg.sideNameId, name || "—");
  setImage(editorInfo, name, cfg);
  setText(cfg.sideInstitutionName, person['Institution Name']);
  setText(cfg.sideCountryName, person['Country'])

  const sideNameEl = document.getElementById(cfg.sideNameId);
  const sideAffEl = document.getElementById(cfg.sideAffId);
  const sideImgEl = document.getElementById(cfg.sideImageId);
  const sideContainerEl = document.getElementById(cfg.sideContainerId);

  if (sideNameEl) sideNameEl.textContent = name || "—";
  if (sideAffEl) sideAffEl.innerHTML = affHTML || "";
  if (sideImgEl) {
    if (imgSrc) {
      sideImgEl.src = imgSrc;
      sideImgEl.alt = `${role} photo`;
      sideImgEl.removeAttribute("hidden");
    } else {
      sideImgEl.setAttribute("hidden", "hidden");
      sideImgEl.removeAttribute("src");
    }
  }
  if (sideContainerEl) {
    sideContainerEl.hidden = false;
  }
}

function setImage(editorInfo, name, cfg){
  const BASE_URL = "https://pubs.acs.org";
  document.getElementById(cfg.sideProfileImageId).src= BASE_URL+ editorInfo[name].imgUrl;
}

function adjustVisibility(hasEditorInChief, hasDeputyEditor) {
  const mainEICName = document.getElementById("mainSectionEditorName");
  const mainDEName = document.getElementById("mainSectionDeputyName");
  if (mainEICName?.parentElement) {
    mainEICName.parentElement.style.display = hasEditorInChief ? "" : "none";
  }
  if (mainDEName?.parentElement) {
    mainDEName.parentElement.style.display = hasDeputyEditor ? "" : "none";
  }

  const eicContainer = document.getElementById("editor-in-chief");
  const deContainer = document.getElementById("deputy-editor");
  if (eicContainer) eicContainer.hidden = !hasEditorInChief;
  if (deContainer) deContainer.hidden = !hasDeputyEditor;

  const editorCard = document.getElementById("editor-card");
  if (editorCard) {
    editorCard.style.display =
      hasEditorInChief || hasDeputyEditor ? "" : "none";
  }
}

async function loadMastheadAndRenderEditors(code, editorInfo) {
  try {
    const masthead = await fetchJSON(`${MASTHEAD_BASE}/${code}.json`);
    const rows = Array.isArray(masthead?.data) ? masthead.data : [];

    let hasEditorInChief = false;
    let hasDeputyEditor = false;

    rows.forEach((person) => {
      if (person?.["Masthead Category"] === "Editor-in-Chief") {
        hasEditorInChief = true;
        updateEditorInfo(person, editorInfo, "Editor-in-Chief");
      }
    });

    rows.forEach((person) => {
      if (person?.["Masthead Category"] === "Deputy Editor") {
        hasDeputyEditor = true;
        updateEditorInfo(person, editorInfo, "Deputy Editor");
      }
    });

    adjustVisibility(hasEditorInChief, hasDeputyEditor);
  } catch (err) {
    console.error("Error fetching masthead data:", err);
    const hasEICInfo = !!(
      editorInfo?.["Editor-in-Chief"] ??
      editorInfo?.eic ??
      null
    );
    const hasDEInfo = !!(
      editorInfo?.["Deputy Editor"] ??
      editorInfo?.deputy ??
      null
    );
    adjustVisibility(hasEICInfo, hasDEInfo);
  }
}

function findRelatedJournals(code, allJournalsArray) {
  return allJournalsArray.relatedJournals.find((journal) =>
    journal.coden.includes(code)
  );
}

async function renderJournalForCoden(code, indexes) {
  const { infoIndex, metricsIndex, allJournalsArray } = indexes;
  let relatedJournals = findRelatedJournals(code, allJournalsArray);
  const info = getJournalInfo(infoIndex, code);
  const metrics = getJournalMetrics(metricsIndex, code);

  const codenData = await fetchJSON(`${JSON_DIR}/${code}.json`);

  setText("journal-title", metrics?.title ?? "—");
  setText("blurbDesc", info?.blurb ?? "—");

  const editorInfo = getEditorInfo(info);
  const fallbackEIC =
    editorInfo?.["Editor-in-Chief"]?.toString?.() ??
    (typeof editorInfo?.eic === "string" ? editorInfo.eic : "");
  const fallbackDeputy =
    editorInfo?.["Deputy Editor"]?.toString?.() ??
    (typeof editorInfo?.deputy === "string" ? editorInfo.deputy : "");

  setText("mainSectionEditorName", fallbackEIC || "");
  setText("mainSectionDeputyName", fallbackDeputy || "");

  setText("mainSectionImpactFactor", metrics?.impact2yr ?? "—");
  setText("mainSectionCitationScore", metrics?.citations ?? "—");
  setText("mainSectionCiteScore", metrics?.citescore ?? "—");
  setText("detailSectionCitationScore", metrics?.citations ?? "—");
  setText("detailSectionTwoYearImpactFactor", metrics?.impact2yr ?? "—");
  setText("detailSectionFiveYearImpactFactor", metrics?.impact5yr ?? "—");
  setText("detailSectionCiteScore", metrics?.citescore ?? "—");
  setText("daysFromAcceptToASAP", metrics?.AcceptToASAP ?? "—");
  setText("detailSectionTotalCitations", metrics?.citations ?? "—");
  setText("detailSectionDaysToFirstPeerReview", metrics?.SubToFDwPR ?? "—");
  setText("daysToAccept", metrics?.SubToAccept ?? "—");
  setRelatedJournalOptions(relatedJournals, code);

  await loadMastheadAndRenderEditors(code, editorInfo);
}

function setRelatedJournalOptions(relatedJournals, code){
      const select = document.getElementById('relatedJournals');
      relatedJournals.coden.forEach(item => {
        if(item === code){
          return;
        }
        const option = document.createElement('option');
        option.value = item;  // Set the value
        option.textContent = item; // Set the display text
        option.style.background = '#081B33';
        select.appendChild(option); // Add to select
      });


}

function fetchImages(editorInfo) {
  const baseURL = "https://pubs.acs.org";
  fetch(baseURL + editorInfo[Object.keys(editorInfo)[0]].imgUrl)
    .then((res) => {})
    .catch((err) => {});
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}
function setPreJSON(id, obj) {
  const el = document.getElementById(id);
  if (el) el.textContent = JSON.stringify(obj, null, 2);
}

let indexesCache = null;

async function loadIndexesOnce() {
  if (indexesCache) return indexesCache;
  const [infoIndex, metricsIndex, allJournalsArray] = await Promise.all([
    fetchJSON(INFO_FILE),
    fetchJSON(METRICS_FILE),
    fetchJSON(RELATED_JOURNALS),
  ]);
  indexesCache = { infoIndex, metricsIndex, allJournalsArray };
  return indexesCache;
}

async function render(routeName) {
  const indexes = await loadIndexesOnce();
  console.log(indexes);
  const knownCodens = new Set([
    ...Object.keys(
      (indexes.infoIndex.journalInfo ?? indexes.infoIndex)?.journal ?? {}
    ),
    ...Object.keys(
      (indexes.metricsIndex.journal_metrics ?? indexes.metricsIndex)?.journal ??
        {}
    ),
  ]);

  if (knownCodens.has(routeName)) {
    showOnly("journal");
    try {
      await renderJournalForCoden(routeName, indexes);
    } catch (err) {
      console.error(err);
    }
    return;
  }

  console.warn(`Unknown route/coden: "${routeName}"`);
  showOnly("home");
}

render(route);
let route = "aambcb"; // change as needed

const CORS_PROXY = "https://corsproxy.io/?url=";
const BASE_URL = "https://pubs.acs.org/pb-assets/json/";
const JSON_DIR = "./json";
const INFO_FILE = `${JSON_DIR}/journal-info.json`; //CORS_PROXY+BASE_URL+'journal-info.json';
const METRICS_FILE = `${JSON_DIR}/journal_metrics.json`;
const RELATED_JOURNALS = `${JSON_DIR}/relatedJournals.json`;
const MASTHEAD_BASE =
  "https://raw.githubusercontent.com/DSCO-Support/JournalMastheads/refs/heads/main/mastheads";

function updateEditorsHref() {
  const el = document.getElementById("viewEditorsMainSection");
  const el1 = document.getElementById("viewEditorsInSideBar");
  const el2 = document.getElementById("currentIssuePub");
  if (!el) return;

  const updatedRoute = String(route || "").replace(/^\/+|\/+$/g, "");
  if (!updatedRoute) return;

  if (el) {
    el.setAttribute("href", `/${updatedRoute}/editors`);
  }
  if (el1) {
    el1.setAttribute("href", `/${updatedRoute}/editors`);
  }
  if (el2) {
    el2.setAttribute("href", `/toc/${updatedRoute}/current#Mastheads`);
  }
}
updateEditorsHref();

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
      sideCountryName: "chiefCountry",
    },
    "Deputy Editor": {
      mainNameId: "mainSectionDeputyName",
      sideContainerId: "deputy-editor",
      sideNameId: "sideSectionDeputyName",
      sideProfileImageId: "deputyEditorProfileIcon",
      sideInstitutionName: "deputyUnivName",
      sideCountryName: "deputyCountry",
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

  if (name) {
    setText(cfg.mainNameId, name || "—");
    setText(cfg.sideNameId, name || "—");
    setImage(editorInfo, name, cfg);
  }
  if (person) {
    setWebsiteLink(cfg.sideNameId, person);
    setText(cfg.sideInstitutionName, person["Institution Name"]);
    setText(cfg.sideCountryName, person["Country"]);
  }
}

function setWebsiteLink(id, person) {
  const el = document.getElementById(id);
  if (el instanceof HTMLAnchorElement && person.Website) {
    el.href = person.Website;
    el.target = "_blank";
  }
}

function setImage(editorInfo, name, cfg) {
  const BASE_URL = "https://pubs.acs.org";
  const imageEl = document.getElementById(cfg.sideProfileImageId);
  imageEl.src = BASE_URL + editorInfo[name].imgUrl;
  if (!editorInfo[name].imgUrl) {
    imageEl.onerror = null;
    imageEl.src =
      "https://pubs.acs.org/pb-assets/ux3/journal-about/avatar-1704309094807.svg";
  }
}

function adjustVisibility(hasEditorInChief, hasDeputyEditor) {
  const mainEICName = document.getElementById("mainSectionEditorName");
  const mainDEName = document.getElementById("mainSectionDeputyName");
  const sideEICName = document.getElementById("sideSectionEditorName");
  const sideDEName = document.getElementById("sideSectionDeputyName");

  if (mainEICName?.parentElement) {
    mainEICName.parentElement.style.display = hasEditorInChief ? "" : "none";
  }
  if (mainDEName?.parentElement) {
    mainDEName.parentElement.style.display = hasDeputyEditor ? "" : "none";
  }
  if (sideEICName?.closest("#sideSectionEditorInChiefContainer")) {
    sideEICName.closest("#sideSectionEditorInChiefContainer").style.display =
      hasEditorInChief ? "" : "none";
  }
  if (sideDEName?.closest("#sideSectionDeputyEditorContainer")) {
    sideDEName.closest("#sideSectionDeputyEditorContainer").style.display =
      hasDeputyEditor ? "" : "none";
  }

  // const eicContainer = document.getElementById("editor-in-chief");
  // const deContainer = document.getElementById("deputy-editor");
  // if (eicContainer) eicContainer.hidden = !hasEditorInChief;
  // if (deContainer) deContainer.hidden = !hasDeputyEditor;

  // const editorCard = document.getElementById("editor-card");
  // if (editorCard) {
  //   editorCard.style.display =
  //     hasEditorInChief || hasDeputyEditor ? "" : "none";
  // }
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

  //const codenData = await fetchJSON(`${JSON_DIR}/${code}.json`);

  setText("journal-title", metrics?.title ?? "—");
  setBlurbValue(metrics, info);

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
  setText(
    "mainSectionCitationScore",
    formatNumber(metrics?.citations) ? formatNumber(metrics?.citations) : "NaN"
  );
  setText(
    "mainSectionCiteScore",
    metrics?.citescore ? metrics?.citescore : "NaN"
  );
  setText(
    "detailSectionCitationScore",
    formatNumber(metrics?.citations) ?? "NaN"
  );
  setText(
    "detailSectionTwoYearImpactFactor",
    metrics?.impact2yr ? metrics?.impact2yr : "NaN"
  );
  setText(
    "detailSectionFiveYearImpactFactor",
    metrics?.impact5yr ? metrics?.impact5yr : "NaN"
  );
  setText(
    "detailSectionCiteScore",
    metrics?.citescore ? metrics?.citescore : "NaN"
  );
  setText(
    "daysFromAcceptToASAP",
    metrics?.AcceptToASAP ? metrics?.AcceptToASAP : "NaN"
  );
  setText(
    "detailSectionTotalCitations",
    formatNumber(metrics?.citations) ?? "NaN"
  );
  setText(
    "detailSectionDaysToFirstPeerReview",
    metrics?.SubToFDwPR ? metrics?.SubToFDwPR : "NaN"
  );
  setText("daysToAccept", metrics?.SubToAccept ? metrics?.SubToAccept : "NaN");

  if (relatedJournals) {
    setRelatedJournalOptions(relatedJournals, code);
  } else {
    document.getElementById("relatedJournalsParent").style.display = "none";
  }

  document.querySelectorAll(".providedYear").forEach((i) => {
    i.textContent = metricsIndex.journal_metrics.year;
  });
  setIndexedAndAbstractedData(info);

  await loadMastheadAndRenderEditors(code, editorInfo);
}

function setBlurbValue(metrics, info) {
  let tailValue = info.blurb.slice(metrics.title.length);
  let emElement = document.createElement("em");
  emElement.textContent = info.title;
  let el = document.getElementById("blurbDesc");
  el.textContent = "";
  const tailNode = document.createTextNode(tailValue);
  el.append(emElement, tailNode);
}

function setIndexedAndAbstractedData(info) {
  const indexedList = document.getElementById("indexedList");
  indexedList.innerHTML = "";
  info.indexAbstract.forEach((abstract) => {
    const listItem = document.createElement("li");
    listItem.textContent = abstract;
    indexedList.appendChild(listItem);
  });
}

function setRelatedJournalOptions(relatedJournals, code) {
  const select = document.getElementById("relatedJournalsDropdown");
  relatedJournals.journ_name.forEach((item) => {
    if (item.includes(code)) {
      return;
    }
    let optionValue = item.split("|")[0].toString().trim();
    let coden = item.split("|")[1].toString().trim();
    const listElement = document.createElement("li");
    const anchorElement = document.createElement("a");
    listElement.role = "option";
    anchorElement.dataset.value = optionValue;
    anchorElement.dataset.coden = coden;
    anchorElement.textContent = optionValue;
    anchorElement.href = "/" + coden;
    listElement.append(anchorElement);
    select.appendChild(listElement);
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
    document.getElementById("main").innerHTML = "<h1>404 Not Found</h1>";
}

function openInNewTab(event, url) {
  event.preventDefault();
  window.open(url + route, "_blank");
}

function redirectToCoden(event) {
  let coden = event.target.options[event.target.selectedIndex].dataset.coden;
  if (coden) {
    window.location.href = "/" + coden;
  }
}

render(route);

document.addEventListener("DOMContentLoaded", () => {
  const customSelects = document.querySelectorAll(".custom-select");

  customSelects.forEach((selectWrapper) => {
    const selectBtn = selectWrapper.querySelector(".relatedJournals");
    let arrowEl = document.getElementById("arrow_img");

    // Toggle dropdown visibility on button click
    selectBtn.addEventListener("click", () => {
      selectWrapper.classList.toggle("active");
      if (selectWrapper.classList.contains("active")) {
        arrowEl.src = "./assets/UpArrow.svg";
      } else {
        arrowEl.src = "./assets/DownArrow.svg";
      }
      const expanded =
        selectBtn.getAttribute("aria-expanded") === "true" || false;
      selectBtn.setAttribute("aria-expanded", !expanded);
    });

    window.addEventListener("click", (e) => {
      if (!selectWrapper.contains(e.target)) {
        selectWrapper.classList.remove("active");
        arrowEl.src = "./assets/DownArrow.svg";
        selectBtn.setAttribute("aria-expanded", "false");
      }
    });
  });
});

function relatedJournalValueUpdate(event) {
  const button = document.querySelector(".relatedJournals");
  button.textContent = event.target.textContent;
  button.setAttribute("aria-expanded", "false");
}

function formatNumber(number) {
  const formattedNumber = parseInt(number).toLocaleString("en-US");
  return formattedNumber;
}

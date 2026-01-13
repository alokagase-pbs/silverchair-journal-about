let route = "aamick"; // change as needed
let environment = "local";

// Configuration
const CONFIG = {
  JSON_DIR: environment === "local" ? "./json" : "/DocumentLibrary/json",
  MASTHEAD_BASE:
    "https://raw.githubusercontent.com/DSCO-Support/JournalMastheads/refs/heads/main/mastheads",
  ACS_BASE_URL: "https://pubs.acs.org",
  DEFAULT_AVATAR: "/pb-assets/ux3/journal-about/avatar-1704309094807.svg",
};

const FILES = {
  INFO: `${CONFIG.JSON_DIR}/journal-info.json`,
  METRICS: `${CONFIG.JSON_DIR}/journal_metrics.json`,
  RELATED_JOURNALS: `${CONFIG.JSON_DIR}/relatedJournals.json`,
};

const EDITOR_CONFIG = {
  "Editor-in-Chief": {
    mainNameId: "sc-editors__eic-value",
    sideContainerId: "editor-in-chief",
    sideNameId: "sideSectionEditorName",
    sideProfileImageId: "sc-editor__avatar__editorInChiefProfileIcon",
    sideInstitutionName: "chiefUnivName",
    sideCountryName: "chiefCountry",
    visibilityContainerSelector: "#sc-editor-foot__editorInChief-container",
  },
  "Deputy Editor": {
    mainNameId: "sc-editors__de-value",
    sideContainerId: "deputy-editor",
    sideNameId: "sideSectionDeputyName",
    sideProfileImageId: "deputyEditorProfileIcon",
    sideInstitutionName: "deputyUnivName",
    sideCountryName: "deputyCountry",
    visibilityContainerSelector: "#sideSectionDeputyEditorContainer",
  },
};

// Cache management
let cache = {
  indexes: null,
  masthead: new Map(),
};

// Initialize page
function init() {
  updateEditorsHref();
  setupEventListeners();
  render(route);
}

// Utility functions
function updateEditorsHref() {
  if (!route) return;

  const updatedRoute = route.replace(/^\/+|\/+$/g, "");
  if (!updatedRoute) return;

  const elements = [
    { id: "viewEditorsMainSection", href: `/${updatedRoute}/editors` },
    { id: "viewEditorsInSideBar", href: `/${updatedRoute}/editors` },
    { id: "currentIssuePub", href: `/toc/${updatedRoute}/current#Mastheads` },
  ];

  elements.forEach(({ id, href }) => {
    const el = document.getElementById(id);
    if (el) el.setAttribute("href", href);
  });
}

async function fetchJSON(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    return await res.json();
  } catch (error) {
    console.error(`Failed to fetch ${url}:`, error);
    throw error;
  }
}

function setText(id, value = "") {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function setHTML(id, html) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = html;
}

function toggleVisibility(selector, show) {
  const el = document.querySelector(selector);
  if (el) el.style.display = show ? "" : "none";
}

function formatNumber(number) {
  if (number == null || isNaN(number)) return "NaN";
  return parseInt(number).toLocaleString("en-US");
}

function formatPercent(x) {
  return typeof x === "number" ? `${Math.round(x * 100)}%` : "—";
}

function showOnly(sectionId) {
  document.querySelectorAll(".page").forEach((sec) => {
    sec.classList.toggle("active", sec.id === sectionId);
  });
}

// Data extraction functions
function getJournalInfo(infoJson, code) {
  return (
    infoJson.journalInfo?.journal?.[code] ?? infoJson.journal?.[code] ?? null
  );
}

function getJournalMetrics(metricsJson, code) {
  return (
    metricsJson.journal_metrics?.journal?.[code] ??
    metricsJson.journal?.[code] ??
    null
  );
}

function getEditorInfo(info) {
  return info?.editorInfo ?? info?.editor ?? null;
}

function extractPersonName(person) {
  return (
    person?.["Display Name"] ||
    [person?.["First Name"], person?.["Last Name"]].filter(Boolean).join(" ") ||
    person?.["Name"] ||
    person?.name ||
    ""
  );
}

function buildAffiliation(person) {
  const aff =
    person?.["Affiliation"] ||
    person?.["Institution"] ||
    person?.["Organization"] ||
    "";
  const country = person?.["Country"] || person?.["Location"] || "";

  return [aff, country].filter(Boolean).join("<br>");
}

// Data loading functions
async function loadIndexes() {
  if (cache.indexes) return cache.indexes;

  try {
    const [infoIndex, metricsIndex, allJournalsArray] = await Promise.all([
      fetchJSON(FILES.INFO),
      fetchJSON(FILES.METRICS),
      fetchJSON(FILES.RELATED_JOURNALS),
    ]);

    cache.indexes = { infoIndex, metricsIndex, allJournalsArray };
    return cache.indexes;
  } catch (error) {
    console.error("Failed to load indexes:", error);
    throw error;
  }
}

async function loadMasthead(code) {
  if (cache.masthead.has(code)) {
    return cache.masthead.get(code);
  }

  try {
    const masthead = await fetchJSON(`${CONFIG.MASTHEAD_BASE}/${code}.json`);
    const data = Array.isArray(masthead?.data) ? masthead.data : [];
    cache.masthead.set(code, data);
    return data;
  } catch (error) {
    console.error(`Failed to load masthead for ${code}:`, error);
    cache.masthead.set(code, []);
    return [];
  }
}

// Editor management functions
function updateEditorInfo(person, editorInfo, role) {
  const config = EDITOR_CONFIG[role];
  if (!config) return;

  const name = extractPersonName(person);

  if (name) {
    setText(config.mainNameId, name);
    setText(config.sideNameId, name);
    setEditorImage(editorInfo, name, config);
  }

  if (person) {
    setWebsiteLink(config.sideNameId, person);
    setText(config.sideInstitutionName, person["Institution Name"]);
    setText(config.sideCountryName, person["Country"]);
  }
}

function setWebsiteLink(id, person) {
  const el = document.getElementById(id);
  if (el instanceof HTMLAnchorElement && person.Website) {
    el.href = person.Website;
    el.target = "_blank";
  }
}

function setEditorImage(editorInfo, name, config) {
  const imageEl = document.getElementById(config.sideProfileImageId);
  if (!imageEl) return;

  const imgUrl = editorInfo?.[name]?.imgUrl;
  imageEl.src = imgUrl
    ? CONFIG.ACS_BASE_URL + imgUrl
    : CONFIG.ACS_BASE_URL + CONFIG.DEFAULT_AVATAR;

  imageEl.onerror = () => {
    imageEl.onerror = null;
    imageEl.src = CONFIG.ACS_BASE_URL + CONFIG.DEFAULT_AVATAR;
  };
}

function adjustEditorVisibility(hasEditorInChief, hasDeputyEditor) {
  const mainElements = [
    { id: "sc-editors__eic-value", show: hasEditorInChief },
    { id: "sc-editors__de-value", show: hasDeputyEditor },
  ];

  mainElements.forEach(({ id, show }) => {
    const el = document.getElementById(id);
    if (el?.parentElement) {
      el.parentElement.style.display = show ? "" : "none";
    }
  });

  toggleVisibility(
    "#sc-editor-foot__editorInChief-container",
    hasEditorInChief
  );
  toggleVisibility("#sideSectionDeputyEditorContainer", hasDeputyEditor);
}

async function processEditors(code, editorInfo) {
  try {
    const masthead = await loadMasthead(code);

    let hasEditorInChief = false;
    let hasDeputyEditor = false;

    masthead.forEach((person) => {
      const category = person?.["Masthead Category"];
      if (category === "Editor-in-Chief") {
        hasEditorInChief = true;
        updateEditorInfo(person, editorInfo, "Editor-in-Chief");
      } else if (category === "Deputy Editor") {
        hasDeputyEditor = true;
        updateEditorInfo(person, editorInfo, "Deputy Editor");
      }
    });

    adjustEditorVisibility(hasEditorInChief, hasDeputyEditor);
  } catch (error) {
    console.error("Error processing editors:", error);
    // Fallback to editorInfo data
    const hasEICInfo = !!(editorInfo?.["Editor-in-Chief"] ?? editorInfo?.eic);
    const hasDEInfo = !!(editorInfo?.["Deputy Editor"] ?? editorInfo?.deputy);
    adjustEditorVisibility(hasEICInfo, hasDEInfo);
  }
}

// Journal rendering functions
function setBasicJournalInfo(info, metrics) {
  setText("sc-header__title", metrics?.title);

  if (info?.blurb && metrics?.title) {
    setBlurbValue(metrics, info);
  }

  setText("printEditionISSN", info?.issn);
  setText("webEditionISSN", info?.eissn);
}

function setMetricsInfo(metrics, metricsIndex) {
  const metricsMap = {
    "sc-metrics__impact-value": metrics?.impact2yr,
    "sc-metrics__cites-value": formatNumber(metrics?.citations),
    "sc-metrics__citescore-value": metrics?.citescore ?? "NaN",
    "sc-metrics__value--cites": formatNumber(metrics?.citations),
    "sc-metrics__value--two-if": metrics?.impact2yr ?? "NaN",
    "sc-metrics__value--five-if": metrics?.impact5yr ?? "NaN",
    "sc-metrics__value--citescore": metrics?.citescore ?? "NaN",
    "sc-metrics__value--days-asap": metrics?.AcceptToASAP ?? "NaN",
    "sc-metrics__value--total-cites": formatNumber(metrics?.citations),
    "sc-metrics__value--days-first": metrics?.SubToFDwPR ?? "NaN",
    "sc-metrics__value--days-accept": metrics?.SubToAccept ?? "NaN",
  };

  Object.entries(metricsMap).forEach(([id, value]) => {
    setText(id, value);
  });

  // Set year for all metric year elements
  document.querySelectorAll(".sc-metrics__year").forEach((el) => {
    el.textContent = metricsIndex.journal_metrics?.year ?? "—";
  });
}

function setBlurbValue(metrics, info) {
  const el = document.getElementById("sc-mdw__blurb-value");
  if (!el) return;

  const tailValue = info.blurb.slice(metrics.title.length);
  const emElement = document.createElement("em");
  emElement.textContent = info.title;

  el.textContent = "";
  el.append(emElement, document.createTextNode(tailValue));
}

function setIndexedAbstractedData(info) {
  const indexedList = document.getElementById("indexedList");
  if (!indexedList || !info?.indexAbstract) return;

  indexedList.innerHTML = "";
  info.indexAbstract.forEach((abstract) => {
    const listItem = document.createElement("li");
    listItem.textContent = abstract;
    indexedList.appendChild(listItem);
  });
}

function findRelatedJournals(code, allJournalsArray) {
  return allJournalsArray.relatedJournals?.find((journal) =>
    journal.coden?.includes(code)
  );
}

function setRelatedJournalOptions(relatedJournals, code) {
  const select = document.getElementById("sc-select__menu");
  if (!select || !relatedJournals?.journ_name) return;

  select.innerHTML = "";

  relatedJournals.journ_name.forEach((item) => {
    if (item.includes(code)) return;

    const [optionValue, coden] = item.split("|").map((s) => s.trim());

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

async function renderJournal(code, indexes) {
  const { infoIndex, metricsIndex, allJournalsArray } = indexes;

  const info = getJournalInfo(infoIndex, code);
  const metrics = getJournalMetrics(metricsIndex, code);
  const relatedJournals = findRelatedJournals(code, allJournalsArray);

  if (!info && !metrics) {
    throw new Error(`No data found for journal code: ${code}`);
  }

  // Set basic information
  setBasicJournalInfo(info, metrics);
  setMetricsInfo(metrics, metricsIndex);

  // Handle related journals
  if (relatedJournals) {
    setRelatedJournalOptions(relatedJournals, code);
  } else {
    toggleVisibility("#sc-reljournals", false);
  }

  // Handle indexed/abstracted data
  if (info) {
    setIndexedAbstractedData(info);
  }

  // Handle editors
  const editorInfo = getEditorInfo(info);
  if (editorInfo) {
    const fallbackEIC =
      editorInfo?.["Editor-in-Chief"]?.toString?.() ??
      (typeof editorInfo?.eic === "string" ? editorInfo.eic : "");
    const fallbackDeputy =
      editorInfo?.["Deputy Editor"]?.toString?.() ??
      (typeof editorInfo?.deputy === "string" ? editorInfo.deputy : "");

    setText("sc-editors__eic-value", fallbackEIC);
    setText("sc-editors__de-value", fallbackDeputy);

    await processEditors(code, editorInfo);
  }
}

async function render(routeName) {
  try {
    const indexes = await loadIndexes();
    console.log("Loaded indexes:", indexes);

    const knownCodens = new Set([
      ...Object.keys(getJournalInfo(indexes.infoIndex, "") || {}),
      ...Object.keys(getJournalMetrics(indexes.metricsIndex, "") || {}),
    ]);

    // Get all available codes from both sources
    const infoJournal =
      indexes.infoIndex.journalInfo?.journal ?? indexes.infoIndex.journal ?? {};
    const metricsJournal =
      indexes.metricsIndex.journal_metrics?.journal ??
      indexes.metricsIndex.journal ??
      {};

    const allKnownCodens = new Set([
      ...Object.keys(infoJournal),
      ...Object.keys(metricsJournal),
    ]);

    if (allKnownCodens.has(routeName)) {
      showOnly("journal");
      await renderJournal(routeName, indexes);
    } else {
      console.warn(`Unknown route/coden: "${routeName}"`);
      document.getElementById("main").innerHTML = "<h1>404 Not Found</h1>";
    }
  } catch (error) {
    console.error("Render error:", error);
    document.getElementById("main").innerHTML =
      "<h1>Error loading journal data</h1>";
  }
}

// Event handlers
function openInNewTab(event, url) {
  event.preventDefault();
  window.open(url + route, "_blank");
}

function redirectToCoden(event) {
  const coden = event.target.options[event.target.selectedIndex]?.dataset.coden;
  if (coden) {
    window.location.href = "/" + coden;
  }
}

function relatedJournalValueUpdate(event) {
  const button = document.querySelector(".sc-related-journals");
  if (button) {
    button.textContent = event.target.textContent;
    button.setAttribute("aria-expanded", "false");
  }
}

function setupEventListeners() {
  document.addEventListener("DOMContentLoaded", () => {
    setupCustomSelects();
  });
}

function setupCustomSelects() {
  const customSelects = document.querySelectorAll(".sc-custom-select");

  customSelects.forEach((selectWrapper) => {
    const selectBtn = selectWrapper.querySelector(".sc-related-journals");
    const arrowEl = document.getElementById("sc-select__arrow-img");

    if (!selectBtn) return;

    selectBtn.addEventListener("click", () => {
      const isActive = selectWrapper.classList.contains("active");
      selectWrapper.classList.toggle("active");

      if (arrowEl) {
        arrowEl.classList.toggle("icon-general_arrow-down", isActive);
        arrowEl.classList.toggle("icon-arrow-right", !isActive);
      }

      selectBtn.setAttribute("aria-expanded", (!isActive).toString());
    });

    window.addEventListener("click", (e) => {
      if (!selectWrapper.contains(e.target)) {
        selectWrapper.classList.remove("active");

        if (arrowEl) {
          arrowEl.classList.remove("icon-arrow-right");
          arrowEl.classList.add("icon-general_arrow-down");
        }

        selectBtn.setAttribute("aria-expanded", "false");
      }
    });
  });
}

// Initialize the application
init();

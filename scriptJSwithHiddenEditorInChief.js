let JSON_DIR;
let ASSETS_DIR;
let route = "jpcafh";
let jpcFilter = "";
let environment = "local";
let dataJPC;
if (route === "jpcafh" || route === "jpcbfk" || route === "jpccck") {
  jpcFilter = route;
  route = "jpchax";
}

if (environment === "local") {
  JSON_DIR = "./json";
  ASSETS_DIR = "./assets";
} else {
  JSON_DIR = window.location.origin + "/DocumentLibrary/json";
  ASSETS_DIR = window.location.origin + "/ImageLibrary/journal-editorial-board"
}
const INFO_FILE = `${JSON_DIR}/journal-info.json`;
const METRICS_FILE = `${JSON_DIR}/journal_metrics.json`;
const RELATED_JOURNALS = `${JSON_DIR}/relatedJournals.json`;
const ROLE_SORT = `${JSON_DIR}/masthead-role-sort.json`;
const MASTHEAD_EXCLUSIONS = `${JSON_DIR}/masthead-exclusions.json`;
const JPC_FILTER = `${JSON_DIR}/jpc-filter-1712774473063.json`;
const AVATAR_IMG = `${ASSETS_DIR}/avatar.svg`;
let journalInfoJson;

const MASTHEAD_BASE =
  "https://raw.githubusercontent.com/DSCO-Support/JournalMastheads/refs/heads/main/mastheads/";
const BASE_URL = "https://pubs.acs.org";
// const CORS_PROXY = "https://corsproxy.io/?url=";

async function getMastheadJson(journalCoden, jpcFilter) {
  try {
    const response = await fetch(MASTHEAD_BASE + journalCoden + ".json");
    const dataJCI = await response.json();
    const roleSortOrder = await getRoleSort();
    const exclusions = await getExclusions(journalCoden);
    let roleList = await createRoles(dataJCI["data"], roleSortOrder);
    let sortedJCI = await sortByLastName(
      dataJCI["data"],
      jpcFilter,
      journalCoden
    );
    let display = await displayRoles(
      roleList,
      roleSortOrder,
      sortedJCI,
      journalCoden,
      exclusions[0],
      exclusions[1]
    );
  } catch (error) {
    console.error("Error fetching " + journalCoden + ".json : ", error);
  }
}

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
      mainNameId: "sc-editors__eic-value",
      sideContainerId: "editor-in-chief",
      sideNameId: "sideSectionEditorName",
      sideProfileImageId: "sc-editor__avatar__editorInChiefProfileIcon",
      sideInstitutionName: "chiefUnivName",
      sideCountryName: "chiefCountry",
      emailId: "chiefEmail",
    },
    "Deputy Editor": {
      mainNameId: "sc-editors__de-value",
      sideContainerId: "deputy-editor",
      sideNameId: "sideSectionDeputyName",
      sideProfileImageId: "deputyEditorProfileIcon",
      sideInstitutionName: "deputyUnivName",
      sideCountryName: "deputyCountry",
      emailId: "deputyEmail",
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
    setText(cfg.emailId, person["Email"]);
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
  const imageEl = document.getElementById(cfg.sideProfileImageId);
  imageEl.src = BASE_URL + editorInfo[name].imgUrl;
  if (!editorInfo[name].imgUrl) {
    imageEl.onerror = null;
    imageEl.src = AVATAR_IMG;
  }
}

function adjustVisibility(hasEditorInChief, hasDeputyEditor) {
  const mainEICName = document.getElementById("sc-editors__eic-value");
  const mainDEName = document.getElementById("sc-editors__de-value");
  const sideEICName = document.getElementById("sideSectionEditorName");
  const sideDEName = document.getElementById("sideSectionDeputyName");

  if (mainEICName?.parentElement) {
    mainEICName.parentElement.style.display = hasEditorInChief ? "" : "none";
  }
  if (mainDEName?.parentElement) {
    mainDEName.parentElement.style.display = hasDeputyEditor ? "" : "none";
  }
  if (sideEICName?.closest("#sc-editor-foot__editorInChief-container")) {
    sideEICName.closest(
      "#sc-editor-foot__editorInChief-container"
    ).style.display = hasEditorInChief ? "" : "none";
  }
  if (sideDEName?.closest("#sideSectionDeputyEditorContainer")) {
    sideDEName.closest("#sideSectionDeputyEditorContainer").style.display =
      hasDeputyEditor ? "" : "none";
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

async function renderJournalForCodenForJPCFilter(code, indexes){
   const { infoIndex, metricsIndex, allJournalsArray } = indexes;
  journalInfoJson = infoIndex;
  let relatedJournals = findRelatedJournals(code, allJournalsArray);
  const info = getJournalInfo(infoIndex, code);
  const metrics = getJournalMetrics(metricsIndex, code);
  setText("sc-header__title", metrics?.title ?? "—");
  setBlurbValue(metrics, info);
}

async function renderJournalForCoden(code, indexes) {
  const { infoIndex, metricsIndex, allJournalsArray } = indexes;
  journalInfoJson = infoIndex;
  let relatedJournals = findRelatedJournals(code, allJournalsArray);
  const info = getJournalInfo(infoIndex, code);
  const metrics = getJournalMetrics(metricsIndex, code);

  //const codenData = await fetchJSON(`${JSON_DIR}/${code}.json`);

  setText("sc-header__title", metrics?.title ?? "—");
  setBlurbValue(metrics, info);

  const editorInfo = getEditorInfo(info);
  const fallbackEIC =
    editorInfo?.["Editor-in-Chief"]?.toString?.() ??
    (typeof editorInfo?.eic === "string" ? editorInfo.eic : "");
  const fallbackDeputy =
    editorInfo?.["Deputy Editor"]?.toString?.() ??
    (typeof editorInfo?.deputy === "string" ? editorInfo.deputy : "");

  setText("sc-editors__eic-value", fallbackEIC || "");
  setText("sc-editors__de-value", fallbackDeputy || "");

  setText("sc-metrics__impact-value", metrics?.impact2yr ?? "—");
  setText(
    "sc-metrics__cites-value",
    formatNumber(metrics?.citations) ? formatNumber(metrics?.citations) : "NaN"
  );
  setText(
    "sc-metrics__citescore-value",
    metrics?.citescore ? metrics?.citescore : "NaN"
  );
  setText(
    "sc-metrics__value--cites",
    formatNumber(metrics?.citations) ?? "NaN"
  );
  setText(
    "sc-metrics__value--two-if",
    metrics?.impact2yr ? metrics?.impact2yr : "NaN"
  );
  setText(
    "sc-metrics__value--five-if",
    metrics?.impact5yr ? metrics?.impact5yr : "NaN"
  );
  setText(
    "sc-metrics__value--citescore",
    metrics?.citescore ? metrics?.citescore : "NaN"
  );
  setText(
    "sc-metrics__value--days-asap",
    metrics?.AcceptToASAP ? metrics?.AcceptToASAP : "NaN"
  );
  setText(
    "sc-metrics__value--total-cites",
    formatNumber(metrics?.citations) ?? "NaN"
  );
  setText(
    "sc-metrics__value--days-first",
    metrics?.SubToFDwPR ? metrics?.SubToFDwPR : "NaN"
  );
  setText(
    "sc-metrics__value--days-accept",
    metrics?.SubToAccept ? metrics?.SubToAccept : "NaN"
  );
  setText("printEditionISSN", info?.issn ? info.issn : "");
  setText("webEditionISSN", info?.eissn ? info?.eissn : "");

  if (relatedJournals) {
    setRelatedJournalOptions(relatedJournals, code);
  } else {
    document.getElementById("sc-reljournals").style.display = "none";
  }

  //document.querySelectorAll(".providedYear")
  document.querySelectorAll(".sc-metrics__year").forEach((i) => {
    i.textContent = metricsIndex.journal_metrics.year;
  });
  //setIndexedAndAbstractedData(info);

  await loadMastheadAndRenderEditors(code, editorInfo);
}

function setBlurbValue(metrics, info) {
  let tailValue = info.blurb.slice(metrics.title.length);
  let emElement = document.createElement("em");
  emElement.textContent = info.title;
  let el = document.getElementById("sc-mdw__blurb-value");
  el.textContent = "";
  const tailNode = document.createTextNode(tailValue);
  el.append(emElement, tailNode);
}

// function setIndexedAndAbstractedData(info) {
//   const indexedList = document.getElementById("indexedList");
//   indexedList.innerHTML = "";
//   info.indexAbstract.forEach((abstract) => {
//     const listItem = document.createElement("li");
//     listItem.textContent = abstract;
//     indexedList.appendChild(listItem);
//   });
// }

function setRelatedJournalOptions(relatedJournals, code) {
  const select = document.getElementById("sc-select__menu");
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
  }else{
    await renderJournalForCodenForJPCFilter(routeName, indexes);
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

document.addEventListener("DOMContentLoaded", () => {
  const customSelects = document.querySelectorAll(".sc-custom-select");

  customSelects.forEach((selectWrapper) => {
    const selectBtn = selectWrapper.querySelector(".sc-related-journals");
    let arrowEl = document.getElementById("sc-select__arrow-img");
    // Toggle dropdown visibility on button click
    selectBtn.addEventListener("click", () => {
      selectWrapper.classList.toggle("active");
      if (selectWrapper.classList.contains("active")) {
        //arrowEl.src = "./assets/UpArrow.svg";
        arrowEl.classList.remove("icon-general_arrow-down");
        arrowEl.classList.add(" icon-arrow-right");
      } else {
        //arrowEl.src = "./assets/DownArrow.svg";
        arrowEl.classList.remove("icon-arrow-right");
        arrowEl.classList.add("icon-general_arrow-down");
      }
      const expanded =
        selectBtn.getAttribute("aria-expanded") === "true" || false;
      selectBtn.setAttribute("aria-expanded", !expanded);
    });

    window.addEventListener("click", (e) => {
      if (!selectWrapper.contains(e.target)) {
        selectWrapper.classList.remove("active");
        arrowEl.classList.remove("icon-arrow-right");
        arrowEl.classList.add(" icon-general_arrow-down");
        //arrowEl.src = "./assets/DownArrow.svg";
        selectBtn.setAttribute("aria-expanded", "false");
      }
    });
  });
});

function relatedJournalValueUpdate(event) {
  const button = document.querySelector(".sc-related-journals");
  button.textContent = event.target.textContent;
  button.setAttribute("aria-expanded", "false");
}

function formatNumber(number) {
  const formattedNumber = parseInt(number).toLocaleString("en-US");
  return formattedNumber;
}

async function getRoleSort() {
  try {
    const response = await fetch(ROLE_SORT);
    const dataRoleSort = await response.json();
    let roleSortOrder = [];
    dataRoleSort.sort(function (a, b) {
      let x = a["Role Sort Number"],
        y = b["Role Sort Number"];
      return x < y ? -1 : x > y ? 1 : 0;
    });
    return dataRoleSort;
  } catch (error) {
    console.error("Error fetching masthead-role-sort.json :", error);
  }
}

async function getExclusions(journalCoden) {
  try {
    const response = await fetch(MASTHEAD_EXCLUSIONS);
    const dataExclusions = await response.json();
    let excludeCurrentIssue = false;
    let eabOnly = false;
    let exclusionsArray = [];

    if (dataExclusions[journalCoden]) {
      if (dataExclusions[journalCoden]["currentIssue"] === true) {
        excludeCurrentIssue = true;
        // console.log("excludeCurrentIssue: " + excludeCurrentIssue);
      }
      if (dataExclusions[journalCoden]["allExceptEAB"] === true) {
        eabOnly = true;
        // console.log("eabOnly: " + eabOnly);
      }
    }
    exclusionsArray = [excludeCurrentIssue, eabOnly];
    return exclusionsArray;
  } catch (error) {
    console.error("Error fetching masthead-exclusions.json :", error);
  }
}

async function getJPCfilter() {
  try {
    const response = await fetch(JPC_FILTER);
    const dataJPCfilter = await response.json();
    return dataJPCfilter;
  } catch (error) {
    console.error("Error fetching jpc-filter.json :", error);
  }
}

async function createRoles(arrayEditors, arraySortOrder) {
  let listOfRoles = [];
  let roleListSorted = [];

  // create listOfRoles array of available editor roles in current journal
  for (i = 0; i < arrayEditors.length; i++) {
    if (arrayEditors[i]["Masthead Category"] === "Editor Emerita") {
      arrayEditors[i]["Masthead Category"] = "Editor Emeritus";
    }
    if (listOfRoles.indexOf(arrayEditors[i]["Masthead Category"]) === -1) {
      listOfRoles.push(arrayEditors[i]["Masthead Category"]);
    }
  }

  // sort listOfRoles according to defined masthead role sort order display
  arraySortOrder.forEach(function (sortRole) {
    let found = false;
    listOfRoles = listOfRoles.filter(function (currentRole) {
      if (!found && currentRole == sortRole["Masthead Category"]) {
        roleListSorted.push(currentRole);
        found = true;
        return false;
      } else return true;
    });
  });

  return roleListSorted;
}

async function sortByLastName(arrayEditors, jpcFilter, journalCoden) {
  // arrayEditors.sort(function(a,b){
  //     // return a["Last Name"].toLowerCase().localeCompare(b["Last Name"].toLowerCase());
  //     return a["Last Name"].localeCompare(b["Last Name"], undefined, {sensitivity: 'base'});
  // });
  let sortableEditors = [];
  let unsortableEditors = [];
  for (i = 0; i < arrayEditors.length; i++) {
    if (
      arrayEditors[i]["Journal Name"] ===
        "The Journal of the American Society for Mass Spectrometry" &&
      arrayEditors[i]["Masthead Category"] === "Board of Directors"
    ) {
      unsortableEditors.push(arrayEditors[i]);
    } else {
      // filter JPC deputy editors
      if (jpcFilter != "") {
        if(!dataJPC){
        dataJPC = await getJPCfilter();
        }
        if (dataJPC[jpcFilter]) {
          console.log(jpcFilter + " jpcFilter exists");
          if (
            arrayEditors[i]["Masthead Category"] === "Deputy Editor" &&
            arrayEditors[i]["First Name"] !=
              dataJPC[jpcFilter]["Deputy Editor"]["First Name"] &&
            arrayEditors[i]["Last Name"] !=
              dataJPC[jpcFilter]["Deputy Editor"]["Last Name"]
          ) {
            // console.log(arrayEditors[i]["First Name"] + " " + arrayEditors[i]["Last Name"] + " " + i + " filtered");
          } else {
            sortableEditors.push(arrayEditors[i]);
          }
        } else {
          if (arrayEditors[i]["Masthead Category"] != "Deputy Editor") {
            sortableEditors.push(arrayEditors[i]);
          }
        }
      } else {
        sortableEditors.push(arrayEditors[i]);
      }
    }
  }

  const sortedNames = sortableEditors.sort((a, b) => {
    const result = a["Last Name"].localeCompare(b["Last Name"]);
    return result !== 0
      ? result
      : a["First Name"].localeCompare(b["First Name"]);
  });

  let sortedArray = sortedNames;

  // append jamsef board of directors
  if (journalCoden === "jamsef") {
    let jamsefBOD = await getJAMSEFbod();
    if (jamsefBOD === null) {
      sortedArray = $.merge($.merge([], sortedNames), unsortableEditors);
    } else {
      // console.log(jamsefBOD["data"]);
      sortedArray = sortedArray.concat(jamsefBOD["data"]);
      // console.log(sortedArray);
    }
  }

  return sortedArray;
}

// display
async function displayRoles(
  roles,
  roleSort,
  editorsList,
  coden,
  excludeCurrentIssue,
  eabOnly
) {
  let currentIssue = false;
  let showDisclaimer = false;
  // let disclaimerArray = ["National Institutes of Health"];

  let isDeputyPresent = false;
  if (roles[1] === "Deputy Editor") {
    isDeputyPresent = true;
  }

  const disclaimerLink = document.createElement("a");
  disclaimerLink.className = "disclaimer-link";
  disclaimerLink.href = "#disclaimer";
  disclaimerLink.textContent = "*";

  // Create <p> element
  const disclaimerMessage = document.createElement("p");
  disclaimerMessage.id = "disclaimer";
  disclaimerMessage.className = "disclaimer-message";
  disclaimerMessage.textContent =
    "* This member of the editorial team is serving in their personal capacity";

  // Create <div> container
  const disclaimerContainer = document.createElement("div");
  disclaimerContainer.className = "disclaimer mt-5";

  // Append <p> to <div>
  //disclaimerContainer.appendChild(disclaimerMessage);

  // If you want to append the link and container to the DOM (e.g., body or a specific element)
  //document.body.appendChild(disclaimerLink);
  //document.body.appendChild(disclaimerContainer);

  for (i = 0; i < roles.length; i++) {
    let displayRoleContainer,
      displayRole,
      editorDisplayContainer = "";
    let editorsInRole = [];
    let editorCount = 0;
    let roleSortNum = 0;
    let currentRoleProps;
    let currentRoleMastheadDisplay;

    currentRoleProps = roleSort.find((obj) => {
      return obj["Masthead Category"] === roles[i];
    });
    roleSortNum = parseInt(currentRoleProps["Role Sort Number"]);
    currentRoleMastheadDisplay = currentRoleProps["Display Category"];

    // add link to current issue masthead

    if (
      eabOnly === false &&
      roleSortNum > 110 &&
      roleSortNum < 510 &&
      currentIssue === false
    ) {
      if (excludeCurrentIssue === false) {
        let currentIssueContainer = document.getElementById(
          "currentIssueContainer"
        );
        currentIssueContainer.style.display = "block";
      }
      currentIssue = true;
    }

    displayRoleContainer = document.createElement("div");
    displayRoleContainer.className = "role-container";

    displayRole = document.createElement("h2");
    displayRole.className = "role";
    displayRole.textContent = currentRoleMastheadDisplay;

    editorDisplayContainer = document.createElement("div");
    if (isDeputyPresent && (i === 0 || i === 1)) {
      editorDisplayContainer.className = "editor-information-container";
    } else if (i === 0) {
      editorDisplayContainer.className = "editor-information-container";
    } else {
      editorDisplayContainer.className = "editor-info-container";
    }

    // inside role, loop through to find available editors
    for (editorInfo = 0; editorInfo < editorsList.length; editorInfo++) {
      if (editorsList[editorInfo]["Masthead Category"] === roles[i]) {
        editorCount++;
        editorsInRole.push(editorsList[editorInfo]);
      }
    }

    // check if role needs to be plural
    if (editorCount > 1) {
      if (roleSortNum != 510 && roleSortNum != 511 && roleSortNum != 520) {
        // ignore 'Senior Advisory Board', 'Senior Editorial Advisory Board', 'Editorial Advisory Board'
        if (displayRole.textContent.indexOf("Editor") > -1) {
          displayRole.textContent = displayRole.textContent.replace(
            "Editor",
            "Editors"
          );
        } else if (displayRole.textContent.indexOf("Ambassador") > -1) {
          displayRole.textContent = displayRole.textContent.replace(
            "Ambassador",
            "Ambassadors"
          );
        }
      }
    } else {
      // single item display using css column displays weird in firefox
      editorDisplayContainer.classList.add("single-column");
    }

    // only display sections with editors
    if (editorCount > 0) {
      // sort list of editor objects by last name within role
      editorsInRole.sort(function (a, b) {
        return a["Last Name"] - b["Last Name"];
      });

      for (editors = 0; editors < editorsInRole.length; editors++) {
        let editorDisplay,
          editorName,
          editorInstitution,
          editorCountry,
          editorEmail = "";

        // replace single quote in email and website
        if (editorsInRole[editors]["Email"]) {
          if (editorsInRole[editors]["Email"].includes("'") === true) {
            editorsInRole[editors]["Email"] = editorsInRole[editors][
              "Email"
            ].replace("'", "&apos;");
          }
        }
        if (editorsInRole[editors]["Website"]) {
          if (editorsInRole[editors]["Website"].includes("'") === true) {
            editorsInRole[editors]["Website"] = editorsInRole[editors][
              "Website"
            ].replace("'", "&apos;");
          }
        }

        // display specific information for EIC
        if (eabOnly === false && roleSortNum >= 100 && roleSortNum <= 205) {
          let editorFullName =
            editorsInRole[editors]["First Name"] +
            " " +
            editorsInRole[editors]["Last Name"];
          if (
            editorsInRole[editors]["Masthead Category"] === "Editor-in-Chief" ||
            editorsInRole[editors]["Masthead Category"] === "Deputy Editor"
          ) {
            if(!dataJPC && journalInfoJson){
            editorImageContainer = document.createElement("div");
            editorImage = document.createElement("img");
            editorImage.src =
              BASE_URL +
              journalInfoJson.journalInfo.journal[coden].editorInfo[
                editorFullName
              ].imgUrl;
            editorImage.classList.add("sc-editor__avatar");
            editorImageContainer.appendChild(editorImage);
            editorDisplayContainer.appendChild(editorImageContainer);
            }
          }

          editorDisplay = document.createElement("div");
          editorDisplay.className = "editor-info";

          editorName = document.createElement("div");
          editorName.className = "editor-name";
          editorName.textContent = editorFullName;

          if (
            editorsInRole[editors]["Website"] &&
            editorsInRole[editors]["Website"] != "n/a"
          ) {
            if (
              editorsInRole[editors]["Website"].indexOf("https://") === -1 &&
              editorsInRole[editors]["Website"].indexOf("http://") === -1
            ) {
              editorsInRole[editors]["Website"] =
                "http://" + editorsInRole[editors]["Website"];
            }
            let editorNameLinked = document.createElement("a");
            editorNameLinked.href = editorsInRole[editors]["Website"];
            editorNameLinked.textContent =
              editorsInRole[editors]["First Name"] +
              " " +
              editorsInRole[editors]["Last Name"];
            editorNameLinked.title =
              "Visit " +
              editorsInRole[editors]["First Name"] +
              " " +
              editorsInRole[editors]["Last Name"] +
              "'s website";
            editorName.innerHTML = "";
            editorName.appendChild(editorNameLinked);
          }

          editorInstitution = document.createElement("div");
          editorInstitution.className = "editor-institution";
          editorInstitution.textContent =
            editorsInRole[editors]["Institution Name"];

          if (editorsInRole[editors]["Masthead Disclaimer"] === true) {
            showDisclaimer = true;
            editorName.appendChild(disclaimerLink);
          }

          editorCountry = document.createElement("div");
          editorCountry.className = "editor-country";
          editorCountry.textContent = editorsInRole[editors]["Country"];

          if (editorsInRole[editors]["Email"]) {
            editorEmail = document.createElement("div");
            editorEmail.className = "editor-email";
            editorEmail.innerHTML =
              "E-mail: <a href='mailto:" +
              editorsInRole[editors]["Email"] +
              "' title='E-mail " +
              editorsInRole[editors]["First Name"] +
              " " +
              editorsInRole[editors]["Last Name"] +
              "'>" +
              editorsInRole[editors]["Email"] +
              "</a>";
          }

          editorDisplay.appendChild(editorName);
          editorDisplay.appendChild(editorInstitution);
          editorDisplay.appendChild(editorCountry);
          if (editorEmail) editorDisplay.appendChild(editorEmail);
        }
        // display specific information for Editor Emeritus/as
        else if (
          eabOnly === false &&
          (roleSortNum === 120 ||
            roleSortNum === 121 ||
            roleSortNum === 231 ||
            roleSortNum === 232)
        ) {
          editorDisplay = document.createElement("div");
          editorDisplay.className = "editor-info";

          editorName = document.createElement("div");
          editorName.className = "editor-name";
          editorName.textContent =
            editorsInRole[editors]["First Name"] +
            " " +
            editorsInRole[editors]["Last Name"];

          if (
            editorsInRole[editors]["Website"] &&
            editorsInRole[editors]["Website"] != "n/a"
          ) {
            if (
              editorsInRole[editors]["Website"].indexOf("https://") === -1 &&
              editorsInRole[editors]["Website"].indexOf("http://") === -1
            ) {
              editorsInRole[editors]["Website"] =
                "http://" + editorsInRole[editors]["Website"];
            }
            let editorNameLinked = document.createElement("a");
            editorNameLinked.href = editorsInRole[editors]["Website"];
            editorNameLinked.textContent =
              editorsInRole[editors]["First Name"] +
              " " +
              editorsInRole[editors]["Last Name"];
            editorNameLinked.title =
              "Visit " +
              editorsInRole[editors]["First Name"] +
              " " +
              editorsInRole[editors]["Last Name"] +
              "'s website";
            editorName.innerHTML = "";
            editorName.appendChild(editorNameLinked);
          }

          editorInstitution = document.createElement("div");
          editorInstitution.className = "editor-institution";
          editorInstitution.textContent =
            editorsInRole[editors]["Institution Name"];

          if (editorsInRole[editors]["Masthead Disclaimer"] === true) {
            showDisclaimer = true;
            editorName.appendChild(disclaimerLink);
          }

          editorCountry = document.createElement("div");
          editorCountry.className = "editor-country";
          editorCountry.textContent = editorsInRole[editors]["Country"];

          editorDisplay.appendChild(editorName);
          editorDisplay.appendChild(editorInstitution);
          editorDisplay.appendChild(editorCountry);
        }
        // display specific information for Managing Editor
        else if (
          eabOnly === false &&
          roleSortNum >= 320 &&
          roleSortNum <= 410
        ) {
          editorDisplay = document.createElement("div");
          editorDisplay.className = "editor-info";

          if (
            editorsInRole[editors]["First Name"] &&
            editorsInRole[editors]["Last Name"]
          ) {
            editorName = document.createElement("div");
            editorName.className = "editor-name";
            editorName.textContent =
              editorsInRole[editors]["First Name"] +
              " " +
              editorsInRole[editors]["Last Name"];

            if (
              editorsInRole[editors]["Website"] &&
              editorsInRole[editors]["Website"] != "n/a"
            ) {
              if (
                editorsInRole[editors]["Website"].indexOf("https://") === -1 &&
                editorsInRole[editors]["Website"].indexOf("http://") === -1
              ) {
                editorsInRole[editors]["Website"] =
                  "http://" + editorsInRole[editors]["Website"];
              }
              let editorNameLinked = document.createElement("a");
              editorNameLinked.href = editorsInRole[editors]["Website"];
              editorNameLinked.textContent =
                editorsInRole[editors]["First Name"] +
                " " +
                editorsInRole[editors]["Last Name"];
              editorNameLinked.title =
                "Visit " +
                editorsInRole[editors]["First Name"] +
                " " +
                editorsInRole[editors]["Last Name"] +
                "'s website";
              editorName.innerHTML = "";
              editorName.appendChild(editorNameLinked);
            }

            if (editorsInRole[editors]["Email"]) {
              editorEmail = document.createElement("div");
              editorEmail.className = "editor-email";
              editorEmail.innerHTML =
                "E-mail: <a href='mailto:" +
                editorsInRole[editors]["Email"] +
                "' title='E-mail " +
                editorsInRole[editors]["First Name"] +
                " " +
                editorsInRole[editors]["Last Name"] +
                "'>" +
                editorsInRole[editors]["Email"] +
                "</a>";
            }
          } else {
            editorName = document.createElement("div");
            editorName.className = "editor-name";

            if (editorsInRole[editors]["Email"]) {
              editorEmail = document.createElement("div");
              editorEmail.className = "editor-email";
              editorEmail.innerHTML =
                "E-mail: <a href='mailto:" +
                editorsInRole[editors]["Email"] +
                "' title='E-mail " +
                currentRoleMastheadDisplay +
                "'>" +
                editorsInRole[editors]["Email"] +
                "</a>";
            }
          }

          editorInstitution = document.createElement("div");
          editorInstitution.className = "editor-institution";
          editorInstitution.textContent =
            editorsInRole[editors]["Institution Name"];

          if (editorsInRole[editors]["Masthead Disclaimer"] === true) {
            showDisclaimer = true;
            editorName.appendChild(disclaimerLink);
          }

          editorCountry = document.createElement("div");
          editorCountry.className = "editor-country";
          editorCountry.textContent = editorsInRole[editors]["Country"];

          editorDisplay.appendChild(editorName);
          editorDisplay.appendChild(editorInstitution);
          editorDisplay.appendChild(editorCountry);
          if (editorEmail) editorDisplay.appendChild(editorEmail);
        }
        // display specific information for Associate Editors
        else if (
          eabOnly === false &&
          roleSortNum >= 205 &&
          roleSortNum < 510 &&
          roleSortNum != 260 &&
          roleSortNum != 231 &&
          roleSortNum != 232
        ) {
          editorDisplay = document.createElement("div");
          editorDisplay.className = "editor-info";

          editorName = document.createElement("div");
          editorName.className = "editor-name";
          editorName.textContent =
            editorsInRole[editors]["First Name"] +
            " " +
            editorsInRole[editors]["Last Name"];

          if (
            editorsInRole[editors]["Website"] &&
            editorsInRole[editors]["Website"] != "n/a"
          ) {
            if (
              editorsInRole[editors]["Website"].indexOf("https://") === -1 &&
              editorsInRole[editors]["Website"].indexOf("http://") === -1
            ) {
              editorsInRole[editors]["Website"] =
                "http://" + editorsInRole[editors]["Website"];
            }
            let editorNameLinked = document.createElement("a");
            editorNameLinked.href = editorsInRole[editors]["Website"];
            editorNameLinked.textContent =
              editorsInRole[editors]["First Name"] +
              " " +
              editorsInRole[editors]["Last Name"];
            editorNameLinked.title =
              "Visit " +
              editorsInRole[editors]["First Name"] +
              " " +
              editorsInRole[editors]["Last Name"] +
              "'s website";
            editorName.innerHTML = "";
            editorName.appendChild(editorNameLinked);
          }

          editorInstitution = document.createElement("div");
          editorInstitution.className = "editor-institution";
          editorInstitution.textContent =
            editorsInRole[editors]["Institution Name"];

          if (editorsInRole[editors]["Masthead Disclaimer"] === true) {
            showDisclaimer = true;
            editorName.appendChild(disclaimerLink);
          }

          editorCountry = document.createElement("div");
          editorCountry.className = "editor-country";
          editorCountry.textContent = editorsInRole[editors]["Country"];

          if (editorsInRole[editors]["Email"]) {
            editorEmail = document.createElement("div");
            editorEmail.className = "editor-email";
            editorEmail.innerHTML =
              "E-mail: <a href='mailto:" +
              editorsInRole[editors]["Email"] +
              "' title='E-mail " +
              editorsInRole[editors]["First Name"] +
              " " +
              editorsInRole[editors]["Last Name"] +
              "'>" +
              editorsInRole[editors]["Email"] +
              "</a>";
          }

          editorDisplay.appendChild(editorName);
          editorDisplay.appendChild(editorInstitution);
          editorDisplay.appendChild(editorCountry);
          if (editorEmail) editorDisplay.appendChild(editorEmail);
        }
        // display specific information for EAB
        else if (
          (roleSortNum >= 510 || roleSortNum === 260) &&
          roleSortNum != 580
        ) {
          editorDisplay = document.createElement("div");
          editorDisplay.className = "editor-info";

          editorName = document.createElement("div");
          editorName.className = "editor-name";
          editorName.textContent =
            editorsInRole[editors]["First Name"] +
            " " +
            editorsInRole[editors]["Last Name"];

          if (
            editorsInRole[editors]["Website"] &&
            editorsInRole[editors]["Website"] != "n/a"
          ) {
            if (
              editorsInRole[editors]["Website"].indexOf("https://") === -1 &&
              editorsInRole[editors]["Website"].indexOf("http://") === -1
            ) {
              editorsInRole[editors]["Website"] =
                "http://" + editorsInRole[editors]["Website"];
            }
            let editorNameLinked = document.createElement("a");
            editorNameLinked.href = editorsInRole[editors]["Website"];
            editorNameLinked.textContent =
              editorsInRole[editors]["First Name"] +
              " " +
              editorsInRole[editors]["Last Name"];
            editorNameLinked.title =
              "Visit " +
              editorsInRole[editors]["First Name"] +
              " " +
              editorsInRole[editors]["Last Name"] +
              "'s website";
            editorName.innerHTML = "";
            editorName.appendChild(editorNameLinked);
          }

          editorInstitution = document.createElement("div");
          editorInstitution.className = "editor-institution";
          editorInstitution.textContent =
            editorsInRole[editors]["Institution Name"];

          if (editorsInRole[editors]["Masthead Disclaimer"] === true) {
            showDisclaimer = true;
            editorName.appendChild(disclaimerLink);
          }

          editorCountry = document.createElement("div");
          editorCountry.className = "editor-country";
          editorCountry.textContent = editorsInRole[editors]["Country"];

          editorDisplay.appendChild(editorName);
          editorDisplay.appendChild(editorInstitution);
          editorDisplay.appendChild(editorCountry);
        }
        // display specific information for Board of Directors
        else if (roleSortNum === 580) {
          editorDisplay = document.createElement("div");
          editorDisplay.className = "editor-info";

          let editorTitle = document.createElement("div");
          editorTitle.className = "editor-title";
          editorTitle.textContent = editorsInRole[editors]["Title"];

          editorName = document.createElement("div");
          editorName.className = "editor-name";
          editorName.textContent =
            editorsInRole[editors]["First Name"] +
            " " +
            editorsInRole[editors]["Last Name"];

          if (
            editorsInRole[editors]["Website"] &&
            editorsInRole[editors]["Website"] != "n/a"
          ) {
            if (
              editorsInRole[editors]["Website"].indexOf("https://") === -1 &&
              editorsInRole[editors]["Website"].indexOf("http://") === -1
            ) {
              editorsInRole[editors]["Website"] =
                "http://" + editorsInRole[editors]["Website"];
            }
            let editorNameLinked = document.createElement("a");
            editorNameLinked.href = editorsInRole[editors]["Website"];
            editorNameLinked.textContent =
              editorsInRole[editors]["First Name"] +
              " " +
              editorsInRole[editors]["Last Name"];
            editorNameLinked.title =
              "Visit " +
              editorsInRole[editors]["First Name"] +
              " " +
              editorsInRole[editors]["Last Name"] +
              "'s website";
            editorName.innerHTML = "";
            editorName.appendChild(editorNameLinked);
          }

          editorInstitution = document.createElement("div");
          editorInstitution.className = "editor-institution";
          editorInstitution.textContent =
            editorsInRole[editors]["Institution Name"];

          if (editorsInRole[editors]["Masthead Disclaimer"] === true) {
            showDisclaimer = true;
            editorName.appendChild(disclaimerLink);
          }

          editorCountry = document.createElement("div");
          editorCountry.className = "editor-country";
          editorCountry.textContent = editorsInRole[editors]["Country"];

          editorDisplay.appendChild(editorTitle);
          editorDisplay.appendChild(editorName);
          editorDisplay.appendChild(editorInstitution);
          editorDisplay.appendChild(editorCountry);
        }
        // add name to editor name container
        editorDisplayContainer.appendChild(editorDisplay);
      }

      if (eabOnly === true) {
        if (roleSortNum >= 510 || roleSortNum === 260) {
          displayRoleContainer.appendChild(displayRole);
          displayRoleContainer.appendChild(editorDisplayContainer);
          appendToMasthead(displayRoleContainer, i, isDeputyPresent);
        }
      } else {
        displayRoleContainer.appendChild(displayRole);
        displayRoleContainer.appendChild(editorDisplayContainer);
        appendToMasthead(displayRoleContainer, i, isDeputyPresent);
      }

      if (showDisclaimer === true) {
        document
          .getElementById("masthead-display")
          .appendChild(disclaimerContainer);
      }
    }
  }
}

function appendToMasthead(displayRoleContainer, i, isDeputyPresent) {
  const mastheadDisplay = document.getElementById("masthead-display");

  if (i === 0) {
    const displayRoleParentContainer = document.createElement("div");
    displayRoleParentContainer.classList.add("sc-editor__people");
    displayRoleParentContainer.id = "chiefEditorAndDeputyEditor";
    displayRoleParentContainer.appendChild(displayRoleContainer);
    mastheadDisplay.appendChild(displayRoleParentContainer);
  } else if (i === 1 && isDeputyPresent) {
    const existingParentContainer = document.getElementById(
      "chiefEditorAndDeputyEditor"
    );
    existingParentContainer.appendChild(displayRoleContainer);
  } else {
    mastheadDisplay.appendChild(displayRoleContainer);
  }
}

render(jpcFilter ? jpcFilter : route);
getMastheadJson(route, jpcFilter);

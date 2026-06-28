"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getKaggleuserProfile = getKaggleuserProfile;
exports.parseKaggleAchievements = parseKaggleAchievements;
const puppeteer_1 = __importDefault(require("puppeteer"));
const CATEGORIES = [
    "Competitions",
    "Datasets",
    "Notebooks",
    "Discussions",
];
const RANKS = ["Grandmaster", "Master", "Expert", "Contributor"];
const END_MARKERS = new Set([
    "Awards",
    "Bio",
    "Followers",
    "Following",
    "Badges",
]);
/**
 * Get the user profile from Kaggle
 * @param userName - Kaggle username
 */
async function getKaggleuserProfile(userName) {
    const url = `https://www.kaggle.com/${userName}`;
    const browser = await puppeteer_1.default.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    try {
        const page = await browser.newPage();
        await page.goto(url, { waitUntil: "networkidle2" });
        await new Promise((resolve) => setTimeout(resolve, 8000));
        await page
            .waitForFunction(() => document.body.innerText.includes("Kaggle Achievements"), { timeout: 10000 })
            .catch(() => undefined);
        const pageText = await page.evaluate(() => document.body.innerText);
        const profile = parseKaggleAchievements(pageText);
        const medalCounts = await getMedalCountsByCategory(page);
        for (const category of CATEGORIES) {
            if (profile[category] && medalCounts[category]) {
                profile[category].medal_counts = medalCounts[category];
            }
        }
        return profile;
    }
    finally {
        await browser.close();
    }
}
function parseKaggleAchievements(pageText) {
    const lines = pageText
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);
    const profile = {};
    const startIndex = lines.indexOf("Kaggle Achievements");
    if (startIndex < 0) {
        return profile;
    }
    for (let index = startIndex + 1; index < lines.length; index++) {
        const category = lines[index];
        if (END_MARKERS.has(lines[index])) {
            break;
        }
        if (!CATEGORIES.includes(category)) {
            continue;
        }
        const rank = lines[index + 1];
        if (!RANKS.includes(rank)) {
            continue;
        }
        const nextCategoryIndex = findNextCategoryIndex(lines, index + 1);
        const sectionLines = lines.slice(index + 2, nextCategoryIndex >= 0 ? nextCategoryIndex : lines.length);
        profile[category] = {
            rank,
            medal_counts: parseMedalCounts(sectionLines),
            order: parseOrder(sectionLines),
        };
    }
    return profile;
}
function findNextCategoryIndex(lines, startIndex) {
    for (let index = startIndex + 1; index < lines.length; index++) {
        if (END_MARKERS.has(lines[index])) {
            return index;
        }
        if (CATEGORIES.includes(lines[index])) {
            return index;
        }
    }
    return -1;
}
function parseMedalCounts(lines) {
    const medalCounts = { gold: 0, silver: 0, bronze: 0 };
    const medalIndex = lines.indexOf("MEDALS");
    if (medalIndex < 0) {
        return medalCounts;
    }
    const rankIndex = lines.indexOf("RANK");
    const medalValues = lines
        .slice(medalIndex + 1, rankIndex >= 0 ? rankIndex : lines.length)
        .map(parseNumber)
        .filter((value) => value != null);
    medalCounts.gold = medalValues[0] ?? 0;
    medalCounts.silver = medalValues[1] ?? 0;
    medalCounts.bronze = medalValues[2] ?? 0;
    return medalCounts;
}
function parseOrder(lines) {
    const rankIndex = lines.indexOf("RANK");
    if (rankIndex < 0) {
        return { order: "", participants: "" };
    }
    let order = "";
    let participants = "";
    for (const line of lines.slice(rankIndex + 1)) {
        const number = parseNumber(line);
        if (!order && number != null) {
            order = line;
            continue;
        }
        if (line.startsWith("of ")) {
            participants = line.replace(/^of\s+/, "").trim();
            break;
        }
    }
    return { order, participants };
}
function parseNumber(value) {
    const normalized = value.replace(/,/g, "");
    if (!/^\d+$/.test(normalized)) {
        return null;
    }
    return Number(normalized);
}
async function getMedalCountsByCategory(page) {
    return page.evaluate((categories, ranks) => {
        const medalCountsByCategory = {};
        const parseCount = (value) => {
            const normalized = (value ?? "").replace(/,/g, "").trim();
            return /^\d+$/.test(normalized) ? Number(normalized) : 0;
        };
        const getCategory = (element) => {
            for (let current = element; current && current !== document.body; current = current.parentElement) {
                const lines = (current.innerText ?? "")
                    .split(/\r?\n/)
                    .map((line) => line.trim())
                    .filter(Boolean);
                const category = lines[0];
                const rank = lines[1];
                if (categories.includes(category) && ranks.includes(rank)) {
                    return category;
                }
            }
            return null;
        };
        for (const image of Array.from(document.querySelectorAll("img"))) {
            const medalType = image.title.toLowerCase();
            if (!medalType.includes("medal")) {
                continue;
            }
            const category = getCategory(image);
            if (!category) {
                continue;
            }
            const medalCounts = (medalCountsByCategory[category] ?? (medalCountsByCategory[category] = {
                gold: 0,
                silver: 0,
                bronze: 0,
            }));
            const count = parseCount(image.parentElement?.innerText);
            if (medalType.includes("gold")) {
                medalCounts.gold += count;
            }
            else if (medalType.includes("silver")) {
                medalCounts.silver += count;
            }
            else if (medalType.includes("bronze")) {
                medalCounts.bronze += count;
            }
        }
        return medalCountsByCategory;
    }, CATEGORIES, RANKS);
}

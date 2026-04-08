import { Router } from "express";
import { isAuthenticated } from "./replitAuth";

export const trademarkRouter = Router();

const USPTO_ODP_BASE = "https://developer.uspto.gov/ibd-api/v1";
const USPTO_TSDR_BASE = "https://tsdrapi.uspto.gov/ts/cd";

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 8000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    return response;
  } finally {
    clearTimeout(id);
  }
}

trademarkRouter.get("/trademark/search", isAuthenticated, async (req: any, res) => {
  try {
    const { markName, niceClass, rows = "20", start = "0" } = req.query as Record<string, string>;

    if (!markName || markName.trim().length < 1) {
      return res.status(400).json({ message: "markName is required" });
    }

    const apiKey = process.env.USPTO_ODP_API_KEY;
    let results: any[] = [];
    let total = 0;

    if (apiKey) {
      const params = new URLSearchParams({
        searchText: markName.trim(),
        rows: String(Math.min(parseInt(rows) || 20, 50)),
        start: String(parseInt(start) || 0),
      });
      if (niceClass) {
        params.set("classCodes", niceClass);
      }

      const url = `${USPTO_ODP_BASE}/application/trademark/fulltext?${params}`;

      const response = await fetchWithTimeout(url, {
        headers: {
          "USPTO-API-KEY": apiKey,
          Accept: "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        total = data.response?.numFound || 0;
        const docs = data.response?.docs || [];
        results = docs.map((doc: any) => ({
          serialNumber: doc.serialNumber || doc.applicationNumber,
          markName: doc.markDrawingCode ? doc.wordMark || doc.markIdentification : doc.wordMark || doc.markIdentification,
          wordMark: doc.wordMark,
          status: doc.statusCode === "A" || doc.liveDeadIndicator === "LIVE" ? "LIVE" : "DEAD",
          statusCode: doc.statusCode || doc.liveDeadIndicator,
          filingDate: doc.filingDate,
          registrationDate: doc.registrationDate,
          owner: doc.ownerName || (doc.attorney && doc.attorney[0]?.ownerName) || "Unknown",
          goodsServices: doc.goodsAndServices || doc.gsAndS || "",
          niceClasses: doc.classCodes || [],
          imageUrl: doc.serialNumber
            ? `${USPTO_TSDR_BASE}/rawImage/${doc.serialNumber}`
            : null,
          conflictRisk: calculateConflictRisk(markName.trim(), doc.wordMark || doc.markIdentification || ""),
        }));
      }
    } else {
      results = getMockSearchResults(markName.trim(), niceClass);
      total = results.length;
    }

    res.json({
      results,
      total,
      disclaimer:
        "This is a preliminary screening only, not a legal clearance opinion. Results may not reflect the most recent USPTO records. Consult a licensed trademark attorney before filing.",
    });
  } catch (error: any) {
    if (error.name === "AbortError") {
      return res.status(504).json({ message: "USPTO API request timed out" });
    }
    console.error("Trademark search error:", error);
    res.status(500).json({ message: "Trademark search failed" });
  }
});

trademarkRouter.get("/trademark/image/:serialNumber", isAuthenticated, async (req: any, res) => {
  try {
    const { serialNumber } = req.params;

    if (!serialNumber || !/^\d{6,12}$/.test(serialNumber)) {
      return res.status(400).json({ message: "Invalid serial number" });
    }

    const apiKey = process.env.USPTO_ODP_API_KEY;
    const url = `${USPTO_TSDR_BASE}/rawImage/${serialNumber}`;
    const headers: Record<string, string> = { Accept: "image/*" };
    if (apiKey) {
      headers["USPTO-API-KEY"] = apiKey;
    }

    const response = await fetchWithTimeout(url, { headers });

    if (!response.ok) {
      return res.status(404).json({ message: "Image not found for this serial number" });
    }

    const contentType = response.headers.get("content-type") || "image/png";
    const buffer = await response.arrayBuffer();

    res.set("Content-Type", contentType);
    res.set("Cache-Control", "public, max-age=86400");
    res.send(Buffer.from(buffer));
  } catch (error: any) {
    if (error.name === "AbortError") {
      return res.status(504).json({ message: "USPTO TSDR API request timed out" });
    }
    console.error("Trademark image fetch error:", error);
    res.status(500).json({ message: "Failed to fetch trademark image" });
  }
});

function calculateConflictRisk(query: string, existingMark: string): "HIGH" | "MEDIUM" | "LOW" {
  const q = query.toLowerCase().trim();
  const e = (existingMark || "").toLowerCase().trim();

  if (!e) return "LOW";
  if (q === e) return "HIGH";

  const similarity = stringSimilarity(q, e);
  if (similarity > 0.8) return "HIGH";
  if (similarity > 0.5) return "MEDIUM";

  if (e.includes(q) || q.includes(e)) return "HIGH";

  return "LOW";
}

function stringSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length === 0 || b.length === 0) return 0;

  const maxLen = Math.max(a.length, b.length);
  const editDist = editDistance(a, b);
  return 1 - editDist / maxLen;
}

function editDistance(a: string, b: string): number {
  const dp: number[][] = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[a.length][b.length];
}

function getMockSearchResults(markName: string, niceClass?: string) {
  const mockData = [
    {
      serialNumber: "88123456",
      markName: markName.toUpperCase() + " PRO",
      wordMark: markName.toUpperCase() + " PRO",
      status: "LIVE",
      statusCode: "A",
      filingDate: "2021-03-15",
      registrationDate: "2022-08-10",
      owner: "Example Corp LLC",
      goodsServices: "Computer software; online services",
      niceClasses: ["009", "042"],
      imageUrl: null,
      conflictRisk: calculateConflictRisk(markName, markName.toUpperCase() + " PRO"),
    },
    {
      serialNumber: "87654321",
      markName: markName.toUpperCase() + "X",
      wordMark: markName.toUpperCase() + "X",
      status: "DEAD",
      statusCode: "D",
      filingDate: "2019-07-22",
      registrationDate: null,
      owner: "Old Brand Inc",
      goodsServices: "Financial services; banking",
      niceClasses: ["036"],
      imageUrl: null,
      conflictRisk: calculateConflictRisk(markName, markName.toUpperCase() + "X"),
    },
    {
      serialNumber: "86543210",
      markName: markName.charAt(0).toUpperCase() + markName.slice(1).toLowerCase() + " Solutions",
      wordMark: markName.charAt(0).toUpperCase() + markName.slice(1).toLowerCase() + " Solutions",
      status: "LIVE",
      statusCode: "A",
      filingDate: "2020-11-05",
      registrationDate: "2022-01-20",
      owner: "Solutions Group Ltd",
      goodsServices: "Business consulting; management services",
      niceClasses: ["035"],
      imageUrl: null,
      conflictRisk: calculateConflictRisk(markName, markName + " Solutions"),
    },
  ];

  if (niceClass) {
    return mockData.filter((m) => m.niceClasses.includes(niceClass));
  }
  return mockData;
}

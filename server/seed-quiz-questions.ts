import { db } from "./db";
import { quizQuestions } from "@shared/schema";

// Sample questions from international IP authorities
export const sampleQuestions = [
  // Round 1 - Easy (Questions 1-5)
  {
    category: "USPTO Trademarks",
    difficulty: "easy",
    points: 100,
    question: "What symbol indicates a registered trademark in the United States?",
    options: ["™", "®", "©", "℠"],
    answer: "®",
    hint: "The unregistered trademark symbol is ™, while the registered one has an R.",
    explanation:
      "The ® symbol (R in a circle) indicates a federally registered trademark with the USPTO. The ™ symbol is for unregistered trademarks.",
    sourceAuthority: "USPTO",
    sourceUrl: "https://www.uspto.gov/trademarks/basics/what-trademark",
    sourceCitation: "USPTO Trademark Basics",
    roundNumber: 1,
    questionOrder: 1,
  },
  {
    category: "WIPO Basics",
    difficulty: "easy",
    points: 100,
    question:
      "According to WIPO, how long does copyright protection typically last for individual creators?",
    options: ["20 years", "50 years", "Life + 70 years", "100 years"],
    answer: "Life + 70 years",
    hint: "Copyright lasts longer than patents, extending beyond the creator's lifetime.",
    explanation:
      "Under the Berne Convention and most national laws, copyright lasts for the life of the creator plus 70 years after death.",
    sourceAuthority: "WIPO",
    sourceUrl: "https://www.wipo.int/copyright/en/",
    sourceCitation: "WIPO Copyright Treaty",
    roundNumber: 1,
    questionOrder: 2,
  },
  {
    category: "EUIPO Rights",
    difficulty: "easy",
    points: 100,
    question: "What is the maximum duration for EU design protection according to EUIPO?",
    options: ["10 years", "15 years", "20 years", "25 years"],
    answer: "25 years",
    hint: "It's more than patent protection but requires renewals every 5 years.",
    explanation:
      "Registered Community Designs can be protected for up to 25 years with renewals every 5 years.",
    sourceAuthority: "EUIPO",
    sourceUrl: "https://euipo.europa.eu/ohimportal/en/designs",
    sourceCitation: "EU Design Regulation 6/2002",
    roundNumber: 1,
    questionOrder: 3,
  },
  {
    category: "EPO Patents",
    difficulty: "easy",
    points: 100,
    question: "What is the standard maximum duration of a European patent?",
    options: ["10 years", "15 years", "20 years", "25 years"],
    answer: "20 years",
    hint: "This is the international standard for patent protection.",
    explanation:
      "European patents are granted for 20 years from the filing date, subject to annual renewal fees.",
    sourceAuthority: "EPO",
    sourceUrl: "https://www.epo.org/applying/european/Guide-for-applicants.html",
    sourceCitation: "European Patent Convention Article 63",
    roundNumber: 1,
    questionOrder: 4,
  },
  {
    category: "Copyright Global",
    difficulty: "easy",
    points: 100,
    question: "Which symbol indicates copyright protection?",
    options: ["™", "®", "©", "℗"],
    answer: "©",
    hint: "The ℗ symbol is for sound recordings specifically.",
    explanation:
      "The © symbol indicates copyright protection. ℗ is for phonographic/sound recording copyright.",
    sourceAuthority: "Multiple",
    sourceUrl: "https://www.copyright.gov/circs/circ03.pdf",
    sourceCitation: "Universal Copyright Convention",
    roundNumber: 1,
    questionOrder: 5,
  },

  // Round 2 - Medium (Questions 6-10)
  {
    category: "USPTO Trademarks",
    difficulty: "medium",
    points: 200,
    question: "What is the USPTO's 'likelihood of confusion' test primarily concerned with?",
    options: [
      "Whether marks look identical",
      "Whether consumers might be confused about the source",
      "Whether the marks use the same colors",
      "Whether the businesses are in the same city",
    ],
    answer: "Whether consumers might be confused about the source",
    hint: "It's about consumer perception, not just visual similarity.",
    explanation:
      "The likelihood of confusion test examines whether consumers would believe the goods/services come from the same source.",
    sourceAuthority: "USPTO",
    sourceUrl: "https://www.uspto.gov/trademarks/search/likelihood-confusion",
    sourceCitation: "TMEP Section 1207",
    roundNumber: 2,
    questionOrder: 6,
  },
  {
    category: "WIPO Basics",
    difficulty: "medium",
    points: 200,
    question:
      "Under WIPO treaties, what type of IP protection covers the ornamental design of a functional item?",
    options: ["Patent", "Industrial Design", "Trademark", "Trade Secret"],
    answer: "Industrial Design",
    hint: "It's not about how it works, but how it looks.",
    explanation:
      "Industrial designs protect the aesthetic aspect of an article rather than its technical features.",
    sourceAuthority: "WIPO",
    sourceUrl: "https://www.wipo.int/designs/en/",
    sourceCitation: "Hague Agreement",
    roundNumber: 2,
    questionOrder: 7,
  },
  {
    category: "EUIPO Rights",
    difficulty: "medium",
    points: 300,
    question:
      "How many classes can be covered in a single EU trademark application for the basic fee?",
    options: ["1 class", "2 classes", "3 classes", "5 classes"],
    answer: "1 class",
    hint: "Additional classes require extra fees.",
    explanation:
      "The basic EUIPO fee (€850 online) covers one class. The second class adds €50, and each additional class adds €150.",
    sourceAuthority: "EUIPO",
    sourceUrl: "https://euipo.europa.eu/ohimportal/en/fees-payable-direct",
    sourceCitation: "EUIPO Fee Regulations",
    roundNumber: 2,
    questionOrder: 8,
  },
  {
    category: "EPO Patents",
    difficulty: "medium",
    points: 300,
    question: "Which of these is NOT a requirement for patentability under EPO guidelines?",
    options: ["Novelty", "Inventive step", "Commercial success", "Industrial applicability"],
    answer: "Commercial success",
    hint: "Patents are about technical merit, not market performance.",
    explanation:
      "The EPO requires novelty, inventive step, and industrial applicability. Commercial success is not a patentability requirement.",
    sourceAuthority: "EPO",
    sourceUrl: "https://www.epo.org/law-practice/legal-texts/guidelines.html",
    sourceCitation: "EPO Guidelines Part G, Chapter I",
    roundNumber: 2,
    questionOrder: 9,
  },
  {
    category: "IP Enforcement",
    difficulty: "medium",
    points: 300,
    question: "What does DMCA stand for in IP enforcement?",
    options: [
      "Digital Media Copyright Act",
      "Digital Millennium Copyright Act",
      "Digital Marketing Copyright Agreement",
      "Digital Management Copyright Act",
    ],
    answer: "Digital Millennium Copyright Act",
    hint: "It was enacted at the turn of the millennium.",
    explanation:
      "The Digital Millennium Copyright Act (1998) criminalizes circumvention of copyright protection and limits ISP liability.",
    sourceAuthority: "Multiple",
    sourceUrl: "https://www.copyright.gov/dmca/",
    sourceCitation: "17 U.S.C. § 512",
    roundNumber: 2,
    questionOrder: 10,
  },

  // Round 3 - Hard/Expert (Questions 11-15)
  {
    category: "USPTO Trademarks",
    difficulty: "hard",
    points: 400,
    question:
      "Under USPTO rules, what is the deadline to file a Statement of Use after receiving a Notice of Allowance?",
    options: ["3 months", "6 months", "9 months", "12 months"],
    answer: "6 months",
    hint: "Extensions are available for additional 6-month periods.",
    explanation:
      "After a Notice of Allowance, applicants have 6 months to file a Statement of Use or request an extension.",
    sourceAuthority: "USPTO",
    sourceUrl: "https://www.uspto.gov/trademarks/maintain/prefile-intent-use",
    sourceCitation: "37 CFR § 2.88",
    roundNumber: 3,
    questionOrder: 11,
  },
  {
    category: "WIPO Basics",
    difficulty: "hard",
    points: 400,
    question:
      "How many countries are members of the Madrid Protocol for international trademark registration?",
    options: ["64 countries", "85 countries", "108 countries", "130 countries"],
    answer: "130 countries",
    hint: "It covers more than 120 countries as of 2024.",
    explanation:
      "The Madrid Protocol covers 130 countries, allowing trademark protection in multiple jurisdictions with one application.",
    sourceAuthority: "WIPO",
    sourceUrl: "https://www.wipo.int/madrid/en/",
    sourceCitation: "Madrid Protocol Member States",
    roundNumber: 3,
    questionOrder: 12,
  },
  {
    category: "EUIPO Rights",
    difficulty: "expert",
    points: 500,
    question: "What is the 'genuine use' requirement period for maintaining an EU trademark?",
    options: ["3 years", "5 years", "7 years", "10 years"],
    answer: "5 years",
    hint: "It's half the renewal period.",
    explanation:
      "EU trademarks must be put to genuine use within 5 years of registration or risk cancellation for non-use.",
    sourceAuthority: "EUIPO",
    sourceUrl: "https://euipo.europa.eu/ohimportal/en/use-of-trade-mark",
    sourceCitation: "EU Trade Mark Regulation Article 18",
    roundNumber: 3,
    questionOrder: 13,
  },
  {
    category: "EPO Patents",
    difficulty: "expert",
    points: 500,
    question:
      "What is the priority period under the Paris Convention for filing a European patent application?",
    options: ["6 months", "12 months", "18 months", "30 months"],
    answer: "12 months",
    hint: "It's different from the PCT national phase deadline.",
    explanation:
      "The Paris Convention provides a 12-month priority period for patents (6 months for designs/trademarks).",
    sourceAuthority: "EPO",
    sourceUrl: "https://www.epo.org/applying/international/priority.html",
    sourceCitation: "Paris Convention Article 4",
    roundNumber: 3,
    questionOrder: 14,
  },
  {
    category: "IP Enforcement",
    difficulty: "expert",
    points: 500,
    question:
      "Under the EU IP Enforcement Directive, what is the maximum statutory damages for willful trademark infringement?",
    options: [
      "€100,000 per infringement",
      "€500,000 per infringement",
      "€1,000,000 per infringement",
      "No statutory maximum - based on actual damages",
    ],
    answer: "No statutory maximum - based on actual damages",
    hint: "EU law differs from US statutory damages approach.",
    explanation:
      "The EU doesn't have statutory damages like the US. Damages are based on actual losses, unfair profits, and moral prejudice.",
    sourceAuthority: "EUIPO",
    sourceUrl: "https://euipo.europa.eu/ohimportal/en/web/observatory/ip-enforcement-directive",
    sourceCitation: "Directive 2004/48/EC Article 13",
    roundNumber: 3,
    questionOrder: 15,
  },
];

// Foreign IP in the U.S. — 12 new questions
export const foreignIpQuestions = [
  // Easy
  {
    category: "Foreign IP in the U.S.",
    difficulty: "easy",
    points: 100,
    question:
      "Under the Berne Convention, do foreign nationals automatically receive U.S. copyright protection for their works?",
    options: [
      "Yes, if their country is a Berne member",
      "No, they must register with the U.S. Copyright Office",
      "Only if they reside in the U.S.",
      "Only for works published after 2000",
    ],
    answer: "Yes, if their country is a Berne member",
    hint: "The Berne Convention has nearly 180 member countries.",
    explanation:
      "Nationals of Berne Convention member countries (179+) receive automatic U.S. copyright protection upon creation of their work — no registration required for baseline protection.",
    sourceAuthority: "Copyright.gov",
    sourceUrl: "https://www.copyright.gov/circs/circ38a.pdf",
    sourceCitation: "Circular 38a — International Copyright Relations of the United States",
    roundNumber: 1,
    questionOrder: 16,
  },
  {
    category: "Foreign IP in the U.S.",
    difficulty: "easy",
    points: 100,
    question:
      "Since August 3, 2019, what must all foreign-domiciled trademark applicants do before the USPTO?",
    options: [
      "File through the Madrid Protocol",
      "Be represented by a U.S.-licensed attorney",
      "Provide a certified translation of their mark",
      "Show proof of use in U.S. commerce",
    ],
    answer: "Be represented by a U.S.-licensed attorney",
    hint: "This rule took effect on a specific date in 2019.",
    explanation:
      "As of August 3, 2019, all applicants whose permanent legal residence or principal place of business is outside the U.S. must be represented by a U.S.-licensed attorney in all USPTO proceedings.",
    sourceAuthority: "USPTO",
    sourceUrl: "https://www.uspto.gov/trademarks/apply/foreign-trademark-applicants",
    sourceCitation: "USPTO — Foreign Trademark Applicants",
    roundNumber: 1,
    questionOrder: 17,
  },
  {
    category: "Foreign IP in the U.S.",
    difficulty: "easy",
    points: 100,
    question:
      "Approximately how many countries are members of the Berne Convention for copyright protection?",
    options: ["50+", "100+", "179+", "250+"],
    answer: "179+",
    hint: "It covers the vast majority of countries in the world.",
    explanation:
      "The Berne Convention has 179+ member countries. Works by nationals or residents of any member country receive automatic copyright protection in every other member country.",
    sourceAuthority: "Copyright.gov",
    sourceUrl: "https://www.copyright.gov/circs/circ38a.pdf",
    sourceCitation: "Circular 38a — International Copyright Relations of the United States",
    roundNumber: 1,
    questionOrder: 18,
  },
  {
    category: "Foreign IP in the U.S.",
    difficulty: "easy",
    points: 100,
    question: "What does the Madrid Protocol allow trademark owners to do?",
    options: [
      "File a single application in their home country to seek protection in multiple countries",
      "Bypass the USPTO examination process",
      "Register a trademark without an attorney in the U.S.",
      "Extend a patent into trademark protection",
    ],
    answer:
      "File a single application in their home country to seek protection in multiple countries",
    hint: "It is administered by WIPO and covers 100+ countries.",
    explanation:
      "The Madrid Protocol is a WIPO-administered system allowing owners to file a single international trademark application covering 100+ member countries through their home country's IP office.",
    sourceAuthority: "USPTO",
    sourceUrl: "https://www.uspto.gov/trademarks/apply/madrid-protocol",
    sourceCitation: "USPTO — Madrid Protocol",
    roundNumber: 1,
    questionOrder: 19,
  },
  // Medium
  {
    category: "Foreign IP in the U.S.",
    difficulty: "medium",
    points: 200,
    question:
      "What key benefit does voluntary U.S. Copyright Office registration unlock for foreign nationals who already have Berne protection?",
    options: [
      "Automatic protection in all 179+ Berne member countries",
      "The right to sue for statutory damages and attorney's fees",
      "Priority over domestically registered works",
      "Exemption from the DMCA notice-and-takedown process",
    ],
    answer: "The right to sue for statutory damages and attorney's fees",
    hint: "Without registration, foreign nationals can only sue for actual damages proven in court.",
    explanation:
      "While Berne gives automatic protection, voluntary U.S. Copyright Office registration unlocks the right to seek statutory damages (up to $150,000 per work) and attorney's fees — powerful tools that are otherwise unavailable.",
    sourceAuthority: "Copyright.gov",
    sourceUrl: "https://www.copyright.gov/circs/circ38a.pdf",
    sourceCitation: "Circular 38a — International Copyright Relations of the United States",
    roundNumber: 2,
    questionOrder: 20,
  },
  {
    category: "Foreign IP in the U.S.",
    difficulty: "medium",
    points: 200,
    question:
      "A creator in Germany filed a trademark application in Germany on January 1. Under the Paris Convention, by what date must they file in the U.S. to claim priority from that German filing date?",
    options: [
      "March 1 (2 months)",
      "July 1 (6 months)",
      "January 1 of the following year (12 months)",
      "January 1 two years later (24 months)",
    ],
    answer: "July 1 (6 months)",
    hint: "The Paris Convention priority period for trademarks differs from patents.",
    explanation:
      "Under the Paris Convention, trademark applicants have a 6-month priority window from their home-country filing date to file in the U.S. and claim that earlier priority date. Patents have a 12-month window.",
    sourceAuthority: "USPTO",
    sourceUrl: "https://www.uspto.gov/trademarks/apply/foreign-trademark-applicants",
    sourceCitation: "USPTO — Foreign Trademark Applicants",
    roundNumber: 2,
    questionOrder: 21,
  },
  {
    category: "Foreign IP in the U.S.",
    difficulty: "medium",
    points: 200,
    question:
      "A foreign inventor files a patent in Japan on March 1. Under the Paris Convention, what is the latest date they can file a U.S. patent application and still claim priority from the Japanese filing?",
    options: [
      "September 1 (6 months later)",
      "March 1 the following year (12 months later)",
      "March 1 two years later (24 months later)",
      "June 1 (3 months later)",
    ],
    answer: "March 1 the following year (12 months later)",
    hint: "The patent priority window under the Paris Convention is one year.",
    explanation:
      "The Paris Convention provides a 12-month priority period for patent applications. Filing in the U.S. within 12 months of the home-country application allows the U.S. application to claim the foreign priority date.",
    sourceAuthority: "USPTO",
    sourceUrl: "https://www.uspto.gov/patents/basics/international-protection/pct-information",
    sourceCitation: "USPTO — PCT and International Patent Protection",
    roundNumber: 2,
    questionOrder: 22,
  },
  {
    category: "Foreign IP in the U.S.",
    difficulty: "medium",
    points: 200,
    question:
      "Which USPTO filing basis allows a foreign trademark applicant to rely on a pending foreign trademark application (not yet registered)?",
    options: [
      "Section 44(e)",
      "Section 44(d)",
      "Section 1(a) — use in commerce",
      "Section 66(a) — Madrid Protocol",
    ],
    answer: "Section 44(d)",
    hint: "The letter 'd' stands for a pending foreign application as the filing basis.",
    explanation:
      "Section 44(d) allows a foreign applicant to claim a priority date from their pending home-country application, provided the U.S. filing is made within 6 months of the foreign filing date. Section 44(e) requires an existing registration.",
    sourceAuthority: "USPTO",
    sourceUrl: "https://www.uspto.gov/trademarks/apply/foreign-trademark-applicants",
    sourceCitation: "USPTO — Foreign Trademark Applicants",
    roundNumber: 2,
    questionOrder: 23,
  },
  // Hard / Expert
  {
    category: "Foreign IP in the U.S.",
    difficulty: "hard",
    points: 400,
    question:
      "A foreign trademark applicant files a U.S. application under Section 44(e). What does this filing basis require?",
    options: [
      "A pending trademark application in the applicant's home country",
      "An existing trademark registration in the applicant's home country",
      "Proof of use of the mark in U.S. commerce",
      "Membership in the Madrid Protocol system",
    ],
    answer: "An existing trademark registration in the applicant's home country",
    hint: "The 'e' filing basis requires something already granted, not pending.",
    explanation:
      "Section 44(e) allows a U.S. trademark application based on an existing, issued foreign registration. Unlike Section 44(d), there is no time limit — but the foreign registration must be active and the foreign country must have a treaty with the U.S.",
    sourceAuthority: "USPTO",
    sourceUrl: "https://www.uspto.gov/trademarks/apply/foreign-trademark-applicants",
    sourceCitation: "USPTO — Foreign Trademark Applicants",
    roundNumber: 3,
    questionOrder: 24,
  },
  {
    category: "Foreign IP in the U.S.",
    difficulty: "hard",
    points: 400,
    question:
      "Under the PCT, how long does an applicant typically have from the priority date before they must enter the national phase (pay country-specific fees)?",
    options: ["12 months", "18 months", "30 months", "36 months"],
    answer: "30 months",
    hint: "The PCT national phase deadline extends beyond the Paris Convention priority period.",
    explanation:
      "The PCT system gives applicants up to 30 months from the earliest priority date before they must enter the national phase in each designated country and pay country-specific fees — providing significant time to assess commercial potential.",
    sourceAuthority: "USPTO",
    sourceUrl: "https://www.uspto.gov/patents/basics/international-protection/pct-information",
    sourceCitation: "USPTO — PCT and International Patent Protection",
    roundNumber: 3,
    questionOrder: 25,
  },
  {
    category: "Foreign IP in the U.S.",
    difficulty: "hard",
    points: 400,
    question:
      "Which of the following accurately describes the scope of the PCT (Patent Cooperation Treaty)?",
    options: [
      "It automatically grants patents in all member countries with one application",
      "It allows a single international application that is later examined country-by-country in national phase",
      "It replaces the Paris Convention for all patent priority claims",
      "It only applies to software patents filed via the EPO",
    ],
    answer:
      "It allows a single international application that is later examined country-by-country in national phase",
    hint: "The PCT does not grant patents — that power remains with each national/regional office.",
    explanation:
      "The PCT provides a streamlined international filing procedure covering 150+ countries. However, it does not result in a single international patent — each country still examines and grants (or refuses) the patent in its own national phase proceedings.",
    sourceAuthority: "USPTO",
    sourceUrl: "https://www.uspto.gov/patents/basics/international-protection/pct-information",
    sourceCitation: "USPTO — PCT and International Patent Protection",
    roundNumber: 3,
    questionOrder: 26,
  },
  {
    category: "Foreign IP in the U.S.",
    difficulty: "hard",
    points: 500,
    question:
      "A foreign creator's Berne-protected work is infringed in the United States. They did NOT register with the U.S. Copyright Office. Which remedy is NOT available to them?",
    options: [
      "Injunctive relief to stop the infringement",
      "Actual damages proven in court",
      "Statutory damages of up to $150,000 per work",
      "Recovery of lost profits attributable to infringement",
    ],
    answer: "Statutory damages of up to $150,000 per work",
    hint: "Statutory damages require U.S. copyright registration before the infringement occurred.",
    explanation:
      "Under U.S. copyright law, statutory damages and attorney's fees are only available if the copyright was registered with the U.S. Copyright Office before the infringement began (or within 3 months of first publication). Without registration, foreign nationals are limited to actual damages and lost profits.",
    sourceAuthority: "Copyright.gov",
    sourceUrl: "https://www.copyright.gov/circs/circ38a.pdf",
    sourceCitation: "Circular 38a — International Copyright Relations of the United States",
    roundNumber: 3,
    questionOrder: 27,
  },
];

export async function seedQuizQuestions() {
  console.log("Seeding quiz questions...");

  const allQuestions = [...sampleQuestions, ...foreignIpQuestions];

  try {
    // Insert all questions
    for (const question of allQuestions) {
      await db.insert(quizQuestions).values(question);
    }

    console.log(`Successfully seeded ${allQuestions.length} quiz questions`);
  } catch (error) {
    console.error("Error seeding quiz questions:", error);
    throw error;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedQuizQuestions()
    .then(() => {
      console.log("Seeding complete!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Seeding failed:", error);
      process.exit(1);
    });
}

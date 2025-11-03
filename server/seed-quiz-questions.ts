import { db } from "./db";
import { quizQuestions } from "@shared/schema";

// Sample questions from international IP authorities
const sampleQuestions = [
  // Round 1 - Easy (Questions 1-5)
  {
    category: "USPTO Trademarks",
    difficulty: "easy",
    points: 100,
    question: "What symbol indicates a registered trademark in the United States?",
    options: ["™", "®", "©", "℠"],
    answer: "®",
    hint: "The unregistered trademark symbol is ™, while the registered one has an R.",
    explanation: "The ® symbol (R in a circle) indicates a federally registered trademark with the USPTO. The ™ symbol is for unregistered trademarks.",
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
    question: "According to WIPO, how long does copyright protection typically last for individual creators?",
    options: ["20 years", "50 years", "Life + 70 years", "100 years"],
    answer: "Life + 70 years",
    hint: "Copyright lasts longer than patents, extending beyond the creator's lifetime.",
    explanation: "Under the Berne Convention and most national laws, copyright lasts for the life of the creator plus 70 years after death.",
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
    explanation: "Registered Community Designs can be protected for up to 25 years with renewals every 5 years.",
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
    explanation: "European patents are granted for 20 years from the filing date, subject to annual renewal fees.",
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
    explanation: "The © symbol indicates copyright protection. ℗ is for phonographic/sound recording copyright.",
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
      "Whether the businesses are in the same city"
    ],
    answer: "Whether consumers might be confused about the source",
    hint: "It's about consumer perception, not just visual similarity.",
    explanation: "The likelihood of confusion test examines whether consumers would believe the goods/services come from the same source.",
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
    question: "Under WIPO treaties, what type of IP protection covers the ornamental design of a functional item?",
    options: ["Patent", "Industrial Design", "Trademark", "Trade Secret"],
    answer: "Industrial Design",
    hint: "It's not about how it works, but how it looks.",
    explanation: "Industrial designs protect the aesthetic aspect of an article rather than its technical features.",
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
    question: "How many classes can be covered in a single EU trademark application for the basic fee?",
    options: ["1 class", "2 classes", "3 classes", "5 classes"],
    answer: "1 class",
    hint: "Additional classes require extra fees.",
    explanation: "The basic EUIPO fee (€850 online) covers one class. The second class adds €50, and each additional class adds €150.",
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
    explanation: "The EPO requires novelty, inventive step, and industrial applicability. Commercial success is not a patentability requirement.",
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
      "Digital Management Copyright Act"
    ],
    answer: "Digital Millennium Copyright Act",
    hint: "It was enacted at the turn of the millennium.",
    explanation: "The Digital Millennium Copyright Act (1998) criminalizes circumvention of copyright protection and limits ISP liability.",
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
    question: "Under USPTO rules, what is the deadline to file a Statement of Use after receiving a Notice of Allowance?",
    options: ["3 months", "6 months", "9 months", "12 months"],
    answer: "6 months",
    hint: "Extensions are available for additional 6-month periods.",
    explanation: "After a Notice of Allowance, applicants have 6 months to file a Statement of Use or request an extension.",
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
    question: "How many countries are members of the Madrid Protocol for international trademark registration?",
    options: ["64 countries", "85 countries", "108 countries", "130 countries"],
    answer: "130 countries",
    hint: "It covers more than 120 countries as of 2024.",
    explanation: "The Madrid Protocol covers 130 countries, allowing trademark protection in multiple jurisdictions with one application.",
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
    explanation: "EU trademarks must be put to genuine use within 5 years of registration or risk cancellation for non-use.",
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
    question: "What is the priority period under the Paris Convention for filing a European patent application?",
    options: ["6 months", "12 months", "18 months", "30 months"],
    answer: "12 months",
    hint: "It's different from the PCT national phase deadline.",
    explanation: "The Paris Convention provides a 12-month priority period for patents (6 months for designs/trademarks).",
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
    question: "Under the EU IP Enforcement Directive, what is the maximum statutory damages for willful trademark infringement?",
    options: [
      "€100,000 per infringement",
      "€500,000 per infringement", 
      "€1,000,000 per infringement",
      "No statutory maximum - based on actual damages"
    ],
    answer: "No statutory maximum - based on actual damages",
    hint: "EU law differs from US statutory damages approach.",
    explanation: "The EU doesn't have statutory damages like the US. Damages are based on actual losses, unfair profits, and moral prejudice.",
    sourceAuthority: "EUIPO",
    sourceUrl: "https://euipo.europa.eu/ohimportal/en/web/observatory/ip-enforcement-directive",
    sourceCitation: "Directive 2004/48/EC Article 13",
    roundNumber: 3,
    questionOrder: 15,
  },
];

export async function seedQuizQuestions() {
  console.log("Seeding quiz questions...");
  
  try {
    // Insert all questions
    for (const question of sampleQuestions) {
      await db.insert(quizQuestions).values(question);
    }
    
    console.log(`Successfully seeded ${sampleQuestions.length} quiz questions`);
  } catch (error) {
    console.error("Error seeding quiz questions:", error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
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
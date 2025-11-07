# Solturio Quiz Bot - Question Database

## Summary
**Total Questions:** 50 active questions
**Categories:** 16 different categories
**Point Values:** 100-500 points based on difficulty
**Sources:** All questions sourced from official authorities (USPTO, WIPO, US Copyright Office, EPO, EUIPO)

---

## Questions by Category

### 📋 Trademark (4 questions)
**Source:** USPTO (United States Patent and Trademark Office)

| Difficulty | Points | Question Topic |
|------------|--------|----------------|
| Easy | 100 | Primary purpose of trademarks |
| Medium | 150 | Federal registration duration |
| Medium | 150 | Registered trademark symbol (®) |
| Hard | 200 | Likelihood of confusion test |

**Key Learning Points:**
- Trademarks identify source of goods/services
- Federal registration lasts 10 years with renewal
- ® symbol indicates federal registration
- Likelihood of confusion determines infringement

---

### 📝 Copyright (4 questions)
**Source:** US Copyright Office

| Difficulty | Points | Question Topic |
|------------|--------|----------------|
| Easy | 100 | When protection begins |
| Easy | 100 | Fair use doctrine |
| Medium | 150 | What's not protected by copyright |
| Hard | 200 | Term of copyright (life + 70 years) |

**Key Learning Points:**
- Protection begins when work is created and fixed
- Fair use allows criticism, commentary, education
- Ideas, recipes, facts are not protected
- Copyright lasts life of author + 70 years

---

### 🔬 Patent (4 questions)
**Source:** USPTO

| Difficulty | Points | Question Topic |
|------------|--------|----------------|
| Easy | 100 | Provisional patent applications |
| Medium | 150 | Utility patent duration |
| Medium | 150 | Patentability requirements |
| Hard | 200 | Three types of patents |

**Key Learning Points:**
- Provisional applications give 12-month priority
- Utility patents last 20 years from filing
- Must be novel, non-obvious, and useful
- Three types: utility, design, and plant

---

### 🌐 International IP (3 questions)
**Source:** WIPO (World Intellectual Property Organization)

| Difficulty | Points | Question Topic |
|------------|--------|----------------|
| Medium | 150 | WIPO definition |
| Hard | 200 | Madrid Protocol for trademarks |
| Hard | 200 | Berne Convention for copyright |

**Key Learning Points:**
- WIPO is the UN agency for IP
- Madrid Protocol enables multi-country trademark filing
- Berne Convention governs international copyright

---

### 🪙 NFT & Blockchain IP (4 questions)
**Source:** US Copyright Office / Legal Analysis

| Difficulty | Points | Question Topic |
|------------|--------|----------------|
| Easy | 100 | Blockchain timestamp proof |
| Medium | 150 | Rights conveyed when minting NFT |
| Medium | 150 | Responding to unauthorized NFT minting |
| Hard | 200 | Copyright in NFT metadata |

**Key Learning Points:**
- Blockchain proves WHEN a version existed
- NFT buyers get license, not copyright (unless stated)
- Can file DMCA for unauthorized minting
- Metadata text is copyrightable

---

### 💰 Cryptocurrency IP (1 question)
**Source:** USPTO

| Difficulty | Points | Question Topic |
|------------|--------|----------------|
| Medium | 150 | Trademarking cryptocurrency names |

**Key Learning Points:**
- Can trademark crypto names if they identify your token
- Generic tech terms cannot be trademarked

---

### 🤐 Trade Secrets (1 question)
**Source:** USPTO

| Difficulty | Points | Question Topic |
|------------|--------|----------------|
| Medium | 150 | Trade secret requirements |

**Key Learning Points:**
- Must be secret, valuable, and protected
- No registration required
- Can last indefinitely

---

### 🎯 General IP (2 questions)
**Source:** US Copyright Office / WIPO

| Difficulty | Points | Question Topic |
|------------|--------|----------------|
| Easy | 100 | Copyright symbol meaning |
| Hard | 200 | Longest-lasting IP right |

**Key Learning Points:**
- © indicates copyright protection
- Trade secrets can last indefinitely

---

### 📊 Additional Categories (27 questions)

The database also includes comprehensive questions on:
- **Trademark Basics** (4 questions) - 100-400 points
- **Copyright Law** (4 questions) - 100-400 points
- **IP Symbols** (5 questions) - 100-300 points
- **USPTO Trademarks** (3 questions) - 100-400 points
- **WIPO Basics** (3 questions) - 100-400 points
- **EPO Patents** (3 questions) - 100-500 points
- **EUIPO Rights** (3 questions) - 100-500 points
- **IP Enforcement** (2 questions) - 300-500 points

---

## Point Value Distribution

| Difficulty | Points | Count |
|------------|--------|-------|
| Easy | 100 | 17 questions |
| Medium | 150-300 | 23 questions |
| Hard | 200-400 | 7 questions |
| Expert | 500 | 3 questions |

---

## Authoritative Sources

All questions are sourced from official IP authorities:

### United States
- **USPTO** - United States Patent and Trademark Office
- **US Copyright Office** - Official copyright registration authority

### International
- **WIPO** - World Intellectual Property Organization (UN agency)
- **EPO** - European Patent Office
- **EUIPO** - European Union Intellectual Property Office

### Legal Resources
- Legal analysis and case law for emerging technologies (NFTs, blockchain)

---

## How to Add More Questions

To add questions to the database, use this SQL format:

```sql
INSERT INTO quiz_questions (
  category, 
  difficulty, 
  points, 
  question, 
  options, 
  answer, 
  explanation, 
  source_authority, 
  source_url,
  is_active
) VALUES (
  'Category Name',
  'easy', -- or 'medium', 'hard', 'expert'
  100, -- points based on difficulty
  'Your question text?',
  ARRAY['Wrong answer 1', 'Correct answer', 'Wrong answer 2', 'Wrong answer 3'],
  'Correct answer',
  'Detailed explanation with educational value.',
  'USPTO', -- or other authority
  'https://www.uspto.gov/...',
  true
);
```

---

## Question Quality Guidelines

✅ **Good Questions:**
- Sourced from official IP authorities
- Include proper citations and URLs
- Provide educational explanations
- Cover practical, real-world scenarios
- Relevant to crypto/NFT/blockchain industry

❌ **Avoid:**
- Opinions or interpretations
- Outdated information
- Questions without authoritative sources
- Overly complex legal jargon
- Trick questions

---

## Bot Commands to Test

Once questions are loaded:
- `/quiz` - Start a quiz session in your Telegram group
- `/leaderboard` - View top performers
- `/mystats` - Check your personal stats

---

## Future Question Topics

Consider adding questions on:
- Smart contract IP issues
- DAO trademark registration
- Metaverse IP protection
- AI-generated artwork copyright
- Cross-chain NFT licensing
- Decentralized copyright enforcement
- Token economics and IP valuation

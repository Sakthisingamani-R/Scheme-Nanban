import { useState, useEffect, useRef, useCallback } from "react";

// ─── Firebase Config ──────────────────────────────────────────────────────────
// 🔧 REPLACE with your Firebase project config from console.firebase.google.com
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyDnNOhSvKrR9O3gdkeBfhTuOz3Z_8MDJgg",
  authDomain: "scheme-nanban.firebaseapp.com",
  projectId: "scheme-nanban",
  storageBucket: "scheme-nanban.firebasestorage.app",
  messagingSenderId: "554919606038",
  appId: "1:554919606038:web:795abf1f4aa77e02338237",
  measurementId: "G-53HVGBCCYE"
};

// 🔧 REPLACE with your Anthropic API key
const API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY;

// ─── Admin Credentials ────────────────────────────────────────────────────────
const ADMIN_EMAIL = "#####@mail.com";
const ADMIN_PASSWORD = "#######";

// ─── Firebase SDK loader ──────────────────────────────────────────────────────
let firebaseApp = null, firebaseAuth = null, firebaseDb = null, firebaseStorage = null;

async function initFirebase() {
  if (firebaseApp) return { auth: firebaseAuth, db: firebaseDb, storage: firebaseStorage };
  const { initializeApp } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js");
  const { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut }
    = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js");
  const { getFirestore, doc, setDoc, getDoc, collection, getDocs, updateDoc, query, where }
    = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
  const { getStorage, ref, uploadBytes, getDownloadURL }
    = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js");

  firebaseApp = initializeApp(FIREBASE_CONFIG);
  firebaseAuth = { instance: getAuth(firebaseApp), createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut };
  firebaseDb = { instance: getFirestore(firebaseApp), doc, setDoc, getDoc, collection, getDocs, updateDoc, query, where };
  firebaseStorage = { instance: getStorage(firebaseApp), ref, uploadBytes, getDownloadURL };
  return { auth: firebaseAuth, db: firebaseDb, storage: firebaseStorage };
}

// ─── File to Base64 helper ────────────────────────────────────────────────────
const fileToBase64 = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = reject;
  reader.readAsDataURL(file);
});


// ─── TN Districts ─────────────────────────────────────────────────────────────
const TN_DISTRICTS = [
  "Ariyalur","Chengalpattu","Chennai","Coimbatore","Cuddalore",
  "Dharmapuri","Dindigul","Erode","Kallakurichi","Kanchipuram",
  "Kanyakumari","Karur","Krishnagiri","Madurai","Mayiladuthurai",
  "Nagapattinam","Namakkal","Nilgiris","Perambalur","Pudukkottai",
  "Ramanathapuram","Ranipet","Salem","Sivaganga","Tenkasi",
  "Thanjavur","Theni","Thoothukudi","Tiruchirappalli","Tirunelveli",
  "Tirupathur","Tiruppur","Tiruvallur","Tiruvannamalai","Tiruvarur",
  "Vellore","Viluppuram","Virudhunagar"
];

// ─── Course Departments by Education Level ────────────────────────────────────
const DIPLOMA_COURSES = [
  "Diploma in Civil Engineering","Diploma in Mechanical Engineering",
  "Diploma in Electrical Engineering","Diploma in Electronics Engineering",
  "Diploma in Computer Engineering","Diploma in Information Technology",
  "Diploma in Chemical Engineering","Diploma in Automobile Engineering",
  "Diploma in Textile Technology","Diploma in Fashion Design",
  "Diploma in Architecture","Diploma in Hotel Management",
  "Diploma in Nursing","Diploma in Pharmacy","Diploma in Physiotherapy",
  "Diploma in Agriculture","Diploma in Horticulture",
  "Diploma in Commercial Practice","Diploma in Office Management",
  "Other / Not Listed",
];

const BE_BTECH_DEPARTMENTS = [
  "B.E. Aeronautical Engineering","B.E. Agricultural Engineering",
  "B.E. Automobile Engineering","B.E. Biomedical Engineering",
  "B.E. Biotechnology","B.E. Chemical Engineering","B.E. Civil Engineering",
  "B.E. Computer Science and Engineering","B.E. Electrical and Electronics Engineering",
  "B.E. Electronics and Communication Engineering","B.E. Electronics and Instrumentation Engineering",
  "B.E. Environmental Engineering","B.E. Food Technology","B.E. Industrial Engineering",
  "B.E. Information Technology","B.E. Marine Engineering","B.E. Mechanical Engineering",
  "B.E. Mechatronics Engineering","B.E. Mining Engineering","B.E. Petroleum Engineering",
  "B.E. Production Engineering","B.E. Robotics and Automation","B.E. Structural Engineering",
  "B.E. Textile Technology","B.Tech. Artificial Intelligence and Data Science",
  "B.Tech. Artificial Intelligence and Machine Learning","B.Tech. Bioinformatics",
  "B.Tech. Biotechnology","B.Tech. Chemical Technology",
  "B.Tech. Computer Science and Business Systems","B.Tech. Cyber Security",
  "B.Tech. Data Science","B.Tech. Fashion Technology","B.Tech. Food Processing Technology",
  "B.Tech. Information Technology","B.Tech. Internet of Things","B.Tech. Leather Technology",
  "B.Tech. Pharmaceutical Technology","B.Tech. Plastics Technology",
  "B.Tech. Polymer Technology","B.Tech. Software Engineering","Other / Not Listed",
];

const PG_COURSES = [
  "M.E. / M.Tech. Computer Science","M.E. / M.Tech. VLSI Design",
  "M.E. / M.Tech. Structural Engineering","M.E. / M.Tech. Power Systems",
  "M.Sc. Mathematics","M.Sc. Physics","M.Sc. Chemistry","M.Sc. Computer Science",
  "M.Sc. Data Science","M.Sc. Biotechnology","M.Sc. Environmental Science",
  "MBA","MCA","M.Com","M.A. English","M.A. Tamil","M.A. History","M.A. Economics",
  "M.A. Social Work","M.Ed.","M.Phil. (any discipline)",
  "Ph.D. (any discipline)","Other / Not Listed",
];

const GENERAL_COURSES = [
  "B.Sc. Mathematics","B.Sc. Physics","B.Sc. Chemistry","B.Sc. Computer Science",
  "B.Sc. Biotechnology","B.Sc. Nursing","B.Sc. Agriculture",
  "B.Com","B.Com (Computer Applications)","B.Com (Accounting and Finance)",
  "B.A. English","B.A. Tamil","B.A. History","B.A. Economics","B.A. Sociology",
  "B.A. Public Administration","B.B.A.","B.C.A.","B.Ed.","B.Pharm.",
  "MBBS","BDS","B.A.M.S.","B.H.M.S.","B.V.Sc.",
  "B.Arch.","B.Plan.","LLB","Other / Not Listed",
];

function getCoursesByLevel(level) {
  if (level === "Diploma") return DIPLOMA_COURSES;
  if (level === "UG") return [...BE_BTECH_DEPARTMENTS, ...GENERAL_COURSES];
  if (level === "PG") return PG_COURSES;
  return ["Other / Not Listed"];
}

// ─── Scheme Data ──────────────────────────────────────────────────────────────
const SCHEMES = [
  { id:1, name:"Pudhumai Penn Scheme", provider:"Tamil Nadu Government", type:"Scholarship",
    education_level:["UG","PG"], income_limit:250000, category:["SC","ST","BC","MBC","OC"],
    gender:"female", amount:"Rs.12,000/year", deadline:"2026-09-30",
    description:"Empowering young women in Tamil Nadu to pursue higher education with monthly financial support of Rs.1,000/month.",
    documents:["Aadhaar Card","Income Certificate","Marksheet","Bank Passbook"],
    eligibility:"Female students pursuing UG/PG in government colleges with family income below Rs.2.5L",
    color:"#e11d48", eligibility_rules:{ gender:"female" } },
  { id:2, name:"Moovalur Ramamirtham Scheme", provider:"Adi Dravidar & Tribal Welfare Dept", type:"Scholarship",
    education_level:["UG","PG","Diploma"], income_limit:200000, category:["SC","ST"],
    gender:"all", amount:"Up to Rs.18,000/year", deadline:"2026-10-15",
    description:"Supporting SC/ST students to pursue higher education with hostel and maintenance allowance.",
    documents:["Community Certificate","Income Certificate","Study Certificate"],
    eligibility:"SC/ST students in recognized institutions with income below Rs.2L",
    color:"#7c3aed", eligibility_rules:{} },
  { id:3, name:"BC/MBC Scholarship", provider:"BC, MBC & Minorities Welfare Dept", type:"Scholarship",
    education_level:["10th","12th","Diploma","UG","PG"], income_limit:200000, category:["BC","MBC"],
    gender:"all", amount:"Rs.6,000 to Rs.15,000/year", deadline:"2026-11-01",
    description:"Comprehensive scholarship for BC/MBC students covering tuition and living expenses.",
    documents:["Community Certificate","Income Certificate","Aadhaar Card","Bank Details"],
    eligibility:"BC/MBC students with family income below Rs.2,00,000",
    color:"#0891b2", eligibility_rules:{} },
  { id:4, name:"SC/ST Post-Matric Scholarship", provider:"Adi Dravidar & Tribal Welfare Dept", type:"Scholarship",
    education_level:["12th","Diploma","UG","PG"], income_limit:250000, category:["SC","ST"],
    gender:"all", amount:"Full fee waiver + Rs.12,000/year", deadline:"2026-10-30",
    description:"Post-matric scholarship ensuring SC/ST students face no financial barrier in higher education.",
    documents:["Community Certificate","Income Certificate","Previous Marksheet"],
    eligibility:"SC/ST students post class 10 with income below Rs.2.5L",
    color:"#059669", eligibility_rules:{} },
  { id:5, name:"First Graduate Scholarship", provider:"Higher Education Dept, Tamil Nadu", type:"Scholarship",
    education_level:["UG"], income_limit:200000, category:["SC","ST","BC","MBC","OC"],
    gender:"all", amount:"Rs.24,000/year + Laptop", deadline:"2026-09-20",
    description:"Celebrating first-generation graduates with a special laptop grant and monthly stipend.",
    documents:["First Graduate Certificate","Aadhaar Card","Income Proof","Admission Letter"],
    eligibility:"First graduate in the family pursuing any UG degree",
    color:"#d97706", eligibility_rules:{ first_graduate:"yes" } },
  { id:6, name:"Minority Scholarship", provider:"BC, MBC & Minorities Welfare Dept", type:"Scholarship",
    education_level:["10th","12th","Diploma","UG","PG"], income_limit:200000, category:["BC","MBC","OC"],
    gender:"all", amount:"Rs.8,000 to Rs.18,000/year", deadline:"2026-11-15",
    description:"Financial assistance for minority community students to pursue quality education.",
    documents:["Minority Certificate","Income Certificate","Study Certificate"],
    eligibility:"Minority students (Muslim, Christian, Sikh, etc.) with income below Rs.2L",
    color:"#0284c7", eligibility_rules:{ minority:"yes" } },
  { id:7, name:"Differently Abled Scholarship", provider:"Social Welfare & Women Empowerment Dept", type:"Grant",
    education_level:["10th","12th","Diploma","UG","PG"], income_limit:500000, category:["SC","ST","BC","MBC","OC"],
    gender:"all", amount:"Up to Rs.20,000/year", deadline:"2026-12-01",
    description:"Comprehensive support for differently-abled students including maintenance and special aids.",
    documents:["Disability Certificate (40%+)","Aadhaar Card","Marksheet"],
    eligibility:"Students with 40%+ disability pursuing any course",
    color:"#be185d", eligibility_rules:{ disability:"yes" } },
  { id:8, name:"Chief Minister Merit Scholarship", provider:"School Education Dept, Tamil Nadu", type:"Scholarship",
    education_level:["12th","UG"], income_limit:300000, category:["SC","ST","BC","MBC","OC"],
    gender:"all", amount:"Rs.5,000 lump sum", deadline:"2026-12-31",
    description:"Merit-based reward for students scoring 90%+ in board exams from Tamil Nadu government schools.",
    documents:["Marksheet (90%+)","School Certificate","Aadhaar Card","Bank Passbook"],
    eligibility:"Students scoring 90%+ in TN state board exams from government schools",
    color:"#7c3aed", eligibility_rules:{} },
  { id:9, name:"Post Matric Scholarship (OBC)", provider:"National Scholarship Portal / TNBC Dept", type:"Scholarship",
    education_level:["12th","Diploma","UG","PG"], income_limit:150000, category:["BC","MBC"],
    gender:"all", amount:"Rs.10,000 to Rs.20,000/year", deadline:"2026-11-30",
    description:"Central and state combined scholarship for OBC students pursuing post-matric education.",
    documents:["OBC Certificate","Income Certificate","Aadhaar Card","Bank Details"],
    eligibility:"OBC students with family income below Rs.1.5L pursuing post-10th courses",
    color:"#0891b2", eligibility_rules:{} },
  { id:10, name:"Research Fellowship (SC/ST)", provider:"UGC / Higher Education Dept", type:"Fellowship",
    education_level:["PG"], income_limit:300000, category:["SC","ST"],
    gender:"all", amount:"Up to Rs.3.36L/year", deadline:"2027-02-28",
    description:"Research fellowship for SC/ST students pursuing PhD and M.Phil programs in universities.",
    documents:["NET/JRF Certificate","Community Certificate","Admission Letter","Research Proposal"],
    eligibility:"SC/ST students admitted to PhD/M.Phil with NET qualification",
    color:"#059669", eligibility_rules:{} },
];

// ─── Eligibility Checker ──────────────────────────────────────────────────────
function checkEligibility(scheme, profile) {
  if (!profile) return { eligible: false, reasons: ["Please complete your profile first."] };
  const reasons = [];
  if (scheme.income_limit && profile.family_income && parseInt(profile.family_income) > scheme.income_limit)
    reasons.push(`Family income must be below Rs.${scheme.income_limit.toLocaleString("en-IN")}.`);
  if (scheme.education_level?.length && !scheme.education_level.includes(profile.education_level))
    reasons.push(`This scheme is for ${scheme.education_level.join(", ")} students only.`);
  if (scheme.category?.length && !scheme.category.includes(profile.category))
    reasons.push(`This scheme is for ${scheme.category.join("/")} category students only.`);
  if (scheme.gender !== "all" && scheme.gender !== profile.gender)
    reasons.push(`This scheme is for ${scheme.gender} students only.`);
  if (scheme.eligibility_rules?.disability === "yes" && profile.disability !== "yes")
    reasons.push("This scheme is only for differently-abled students (40%+ disability certificate required).");
  if (scheme.eligibility_rules?.minority === "yes" && profile.minority !== "yes")
    reasons.push("This scheme is only for minority community students.");
  if (scheme.eligibility_rules?.first_graduate === "yes" && profile.first_graduate !== "yes")
    reasons.push("This scheme is only for first-generation graduates in the family.");
  return { eligible: reasons.length === 0, reasons };
}

function getMatchedSchemes(profile) {
  if (!profile) return [];
  return SCHEMES.filter(s => checkEligibility(s, profile).eligible);
}

// ─── Local AI Fallback ────────────────────────────────────────────────────────
function localSchemeResponse(question, profile, matched) {
  const q = question.toLowerCase();

  // ── "How to apply for [scheme name]" ──
  if (q.includes("how to apply") || q.includes("how do i apply") || q.includes("apply for")) {
    for (const scheme of SCHEMES) {
      if (q.includes(scheme.name.toLowerCase()) || (scheme.name.split(" ")[0].length > 3 && q.includes(scheme.name.split(" ")[0].toLowerCase()))) {
        const elig = profile ? checkEligibility(scheme, profile) : null;
        let status = "";
        if (elig && elig.eligible) status = "\n\n\u2705 Great news! Based on your profile, you ARE eligible for this scheme.";
        else if (elig && !elig.eligible) status = `\n\n\u274c Based on your profile, you are NOT eligible. Reason: ${elig.reasons[0]}`;
        return `How to apply for ${scheme.name}:\n\n1. Go to the Browse tab and search for \"${scheme.name}\"\n2. Click on the scheme card to view full details\n3. Click \"Apply Now\" button at the bottom\n4. Upload these required documents:\n   ${scheme.documents.map(d => `\u2022 ${d}`).join("\n   ")}\n5. Review and submit your application\n6. Track status in the \"Applied\" tab\n\n\ud83d\udcb0 Benefit: ${scheme.amount}\n\ud83d\udcc5 Deadline: ${new Date(scheme.deadline).toLocaleDateString("en-IN", {day:"numeric",month:"long",year:"numeric"})} (${daysLeft(scheme.deadline)} days left)${status}`;
      }
    }
    return "To apply for a scheme:\n1. Go to Browse tab and find a scheme\n2. Click on the scheme to see full details\n3. Click 'Apply Now' button\n4. Upload required documents (Aadhaar Card, Community Certificate, Income Certificate)\n5. Submit and track in the 'Applied' tab\n\nWhich scheme would you like to apply for? I can give you specific steps!";
  }

  // ── Eligibility check ──
  if (q.includes("eligible") || q.includes("eligibility") || q.includes("qualify")) {
    if (!profile) return "Please complete your profile first so I can check your eligibility for schemes. Go to the Profile tab to set up your details.";
    if (matched.length === 0) return "Based on your current profile, no schemes match your criteria right now. This could be because of:\n\u2022 Income is above the limit\n\u2022 Education level doesn't match\n\u2022 Category not covered\n\nTry updating your profile with correct details.";
    const list = matched.map((s,i) => `${i+1}. ${s.name} \u2014 ${s.amount}`).join("\n");
    return `Great news! \ud83c\udf89 Based on your profile, you're eligible for ${matched.length} scheme(s):\n\n${list}\n\nAsk \"How to apply for [scheme name]\" for step-by-step guidance!`;
  }

  // ── Document questions ──
  if (q.includes("document") || q.includes("needed") || q.includes("required") || q.includes("attach") || q.includes("upload")) {
    if (matched.length > 0) {
      const docs = matched.map(s => `\ud83d\udcc1 ${s.name}:\n   ${s.documents.map(d => `\u2022 ${d}`).join("\n   ")}`).join("\n\n");
      return `Documents required for your eligible schemes:\n\n${docs}\n\n\u2139\ufe0f All documents must be PDF or Word format, max 5MB each.`;
    }
    return "Common documents needed for TN scholarships:\n\u2022 Aadhaar Card (self-attested copy)\n\u2022 Community Certificate (from Tahsildar)\n\u2022 Annual Income Certificate (current year)\n\u2022 Previous year Marksheets\n\u2022 Bank Passbook (front page)\n\u2022 Study/Bonafide Certificate\n\u2022 Passport size photographs\n\nKeep all documents ready in PDF format before applying!";
  }

  // ── Deadline questions ──
  if (q.includes("deadline") || q.includes("last date") || q.includes("due date") || q.includes("expire")) {
    const upcoming = SCHEMES.filter(s => daysLeft(s.deadline) > 0).sort((a,b) => new Date(a.deadline) - new Date(b.deadline));
    if (upcoming.length === 0) return "All current scheme deadlines have passed. Check back soon for new scheme announcements!";
    const urgent = upcoming.filter(s => daysLeft(s.deadline) <= 30);
    const list = upcoming.map(s => {
      const d = daysLeft(s.deadline);
      const urgency = d <= 7 ? " \ud83d\udea8 URGENT!" : d <= 30 ? " \u26a0\ufe0f Closing soon" : "";
      return `\u2022 ${s.name} \u2014 ${new Date(s.deadline).toLocaleDateString("en-IN", {day:"numeric",month:"long",year:"numeric"})} (${d} days left)${urgency}`;
    }).join("\n");
    return `\ud83d\udcc5 Upcoming deadlines:\n\n${list}${urgent.length > 0 ? `\n\n\u26a0\ufe0f ${urgent.length} scheme(s) closing within 30 days! Apply soon.` : ""}`;
  }

  // ── Specific scheme info (with richer detail) ──
  for (const scheme of SCHEMES) {
    if (q.includes(scheme.name.toLowerCase()) || (scheme.name.split(" ")[0].length > 3 && q.includes(scheme.name.split(" ")[0].toLowerCase()))) {
      const elig = profile ? checkEligibility(scheme, profile) : null;
      let eligText = "";
      if (elig) eligText = elig.eligible ? "\n\n\u2705 You are ELIGIBLE for this scheme!" : `\n\n\u274c You are NOT eligible. Reason: ${elig.reasons[0]}`;
      return `\ud83c\udfdb\ufe0f ${scheme.name}\n\n${scheme.description}\n\n\ud83d\udcb0 Benefit: ${scheme.amount}\n\ud83d\udcc5 Deadline: ${new Date(scheme.deadline).toLocaleDateString("en-IN", {day:"numeric",month:"long",year:"numeric"})} (${daysLeft(scheme.deadline)} days left)\n\ud83c\udfe2 Provider: ${scheme.provider}\n\ud83c\udf93 For: ${scheme.education_level.join(", ")} students\n\ud83d\udc65 Categories: ${scheme.category.join(", ")}\n\ud83d\udcdd Gender: ${scheme.gender === "all" ? "All genders" : scheme.gender}\n\ud83d\udcc4 Documents: ${scheme.documents.join(", ")}\n\n\ud83d\udc49 Eligibility: ${scheme.eligibility}${eligText}`;
    }
  }

  // ── Amount / money questions ──
  if (q.includes("how much") || q.includes("amount") || q.includes("money") || q.includes("stipend") || q.includes("benefit")) {
    const list = SCHEMES.map(s => `\u2022 ${s.name}: ${s.amount}`).join("\n");
    return `\ud83d\udcb0 Scholarship amounts for all schemes:\n\n${list}\n\nThe highest benefit is the Research Fellowship (SC/ST) at up to Rs.3.36L/year!`;
  }

  // ── Income questions ──
  if (q.includes("income") || q.includes("salary") || q.includes("earning")) {
    const incomeSchemes = SCHEMES.map(s => `\u2022 ${s.name}: Below Rs.${s.income_limit.toLocaleString("en-IN")}`).join("\n");
    return `Income limits for each scheme:\n\n${incomeSchemes}\n\n\u2139\ufe0f Most schemes require annual family income below Rs.2-2.5 lakhs. Update your profile with accurate income to see matching schemes.`;
  }

  // ── Category questions ──
  if (q.includes("sc") || q.includes("st") || q.includes("bc") || q.includes("mbc") || q.includes("category") || q.includes("caste")) {
    return "\ud83d\udc65 Category-wise scholarship availability:\n\n\u2022 SC/ST students: 4 schemes available (Post-Matric Scholarship, Moovalur Ramamirtham, BC/MBC Scholarship, Research Fellowship)\n\u2022 BC/MBC students: 3 schemes (BC/MBC Scholarship, Post Matric OBC, Minority Scholarship)\n\u2022 OC (General): 4 schemes (First Graduate, Differently Abled, CM Merit, Minority)\n\n\ud83d\udc49 Set your category correctly in your Profile to see all matching schemes!";
  }

  // ── Status tracking ──
  if (q.includes("status") || q.includes("track") || q.includes("check application") || q.includes("my application")) {
    return "\ud83d\udcca To track your application status:\n\n1. Tap the 'Applied' tab in the bottom navigation\n2. You'll see all your submitted applications\n3. Each application shows its current status:\n   \u2022 \ud83d\udfe6 Applied \u2014 Submitted, waiting for review\n   \u2022 \ud83d\udfe8 Under Review \u2014 Admin is reviewing your documents\n   \u2022 \ud83d\udfe9 Approved \u2014 Congratulations! You're selected\n   \u2022 \ud83d\udfe5 Rejected \u2014 Not approved this time\n\nThe admin reviews your Aadhaar, Community Certificate, and Income Certificate before making a decision.";
  }

  // ── Compare schemes ──
  if (q.includes("compare") || q.includes("which is better") || q.includes("best scheme") || q.includes("recommend")) {
    if (matched.length === 0) return "Complete your profile first so I can recommend the best schemes for you!";
    const sorted = [...matched].sort((a,b) => {
      const aAmt = parseInt(a.amount.replace(/[^0-9]/g, "")) || 0;
      const bAmt = parseInt(b.amount.replace(/[^0-9]/g, "")) || 0;
      return bAmt - aAmt;
    });
    return `\ud83c\udf1f Recommended schemes for you (highest benefit first):\n\n${sorted.map((s,i) => `${i+1}. ${s.name}\n   \ud83d\udcb0 ${s.amount} | \ud83d\udcc5 Deadline: ${daysLeft(s.deadline)}d left`).join("\n\n")}\n\n\ud83d\udc49 I recommend applying to all eligible schemes to maximize your benefits!`;
  }

  // ── First graduate questions ──
  if (q.includes("first graduate") || q.includes("first gen") || q.includes("first generation")) {
    const fg = SCHEMES.find(s => s.id === 5);
    return `\ud83c\udf93 First Graduate Scholarship\n\nIf you're the first person in your family to attend college, you qualify for:\n\n\ud83d\udcb0 Benefit: ${fg.amount}\n\ud83d\udcc5 Deadline: ${new Date(fg.deadline).toLocaleDateString("en-IN", {day:"numeric",month:"long",year:"numeric"})}\n\ud83c\udfe2 By: ${fg.provider}\n\nThis includes a FREE LAPTOP! Make sure to mark 'First Graduate: Yes' in your profile and have your First Graduate Certificate ready.`;
  }

  // ── Female / women schemes ──
  if (q.includes("female") || q.includes("women") || q.includes("girl") || q.includes("lady")) {
    const fem = SCHEMES.filter(s => s.gender === "female");
    const all = SCHEMES.filter(s => s.gender === "all");
    return `\ud83d\udc69 Schemes for female students:\n\n\ud83c\udf1f Exclusive for women:\n${fem.map(s => `\u2022 ${s.name} \u2014 ${s.amount}`).join("\n")}\n\n\ud83d\udc65 Open to all genders:\n${all.map(s => `\u2022 ${s.name} \u2014 ${s.amount}`).join("\n")}\n\nFemale students have access to all ${fem.length + all.length} schemes!`;
  }

  // ── Thank you / goodbye ──
  if (q.includes("thank") || q.includes("thanks") || q.includes("bye") || q.includes("okay") || q.includes("ok")) {
    return "You're welcome! \ud83d\ude0a I'm always here to help with your scholarship queries. Good luck with your applications! \ud83c\udf1f";
  }

  // ── Greeting ──
  if (q.includes("hello") || q.includes("hi") || q.includes("hey") || q.includes("help") || q.includes("what can you do")) {
    return `Hi! I'm SchemeNanban AI \ud83e\udd16 Your personal scholarship assistant!\n\nHere's what I can help you with:\n\u2022 \"Am I eligible for any scheme?\"\n\u2022 \"How to apply for Pudhumai Penn Scheme?\"\n\u2022 \"What documents are needed?\"\n\u2022 \"Show me upcoming deadlines\"\n\u2022 \"How much money will I get?\"\n\u2022 \"Compare schemes for me\"\n\u2022 \"Track my application status\"\n\u2022 \"Tell me about First Graduate Scholarship\"\n\nJust type your question and I'll help! \ud83d\ude80`;
  }

  // ── Default response (varied) ──
  const tips = [
    `I'm here to help with TN government scholarships! Try asking:\n\u2022 \"How to apply for Pudhumai Penn Scheme?\"\n\u2022 \"Am I eligible for any scheme?\"\n\u2022 \"What are the deadlines?\"`,
    `Not sure what to ask? Here are some ideas:\n\u2022 \"Which scheme gives the most money?\"\n\u2022 \"What documents do I need?\"\n\u2022 \"Recommend best schemes for me\"`,
    `I can help you find and apply for scholarships! Try:\n\u2022 \"Tell me about BC/MBC Scholarship\"\n\u2022 \"How to check my application status?\"\n\u2022 \"Am I eligible for First Graduate Scholarship?\"`,
  ];
  return `${tips[Math.floor(Math.random() * tips.length)]}\n\nThere are ${SCHEMES.length} schemes available. ${matched.length > 0 ? `You're eligible for ${matched.length} of them!` : "Complete your profile to discover matching schemes."}`;
}

// ─── AI Chat ──────────────────────────────────────────────────────────────────
async function askAI(messages, profile, matched) {
  const lastMsg = messages[messages.length - 1]?.content || "";

  // Try Anthropic API first
  try {
    const sys = `You are SchemeNanban AI assistant for Tamil Nadu government scholarships.
User profile: ${JSON.stringify(profile || {})}
Matched schemes: ${JSON.stringify(matched?.map(s => s.name) || [])}
Available schemes: ${JSON.stringify(SCHEMES.map(s => ({ name: s.name, amount: s.amount, deadline: s.deadline, eligibility: s.eligibility })))}
Be concise, friendly, helpful. Use simple English. Under 150 words.`;
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 400, system: sys, messages }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    const text = data.content?.[0]?.text;
    if (text) return text;
  } catch(e) {
    console.warn("AI API failed, using local fallback:", e.message);
  }

  // Fallback to intelligent local responses
  return localSchemeResponse(lastMsg, profile, matched);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const daysLeft = (d) => Math.max(0, Math.ceil((new Date(d) - new Date()) / 86400000));

// ─── Design Tokens ────────────────────────────────────────────────────────────
const C = {
  primary:"#1a1a2e", accent:"#e63946", accent2:"#ff6b35",
  bg:"#f4f5f7", card:"#ffffff", muted:"#64748b",
  border:"#e2e8f0", green:"#059669", yellow:"#d97706",
  red:"#dc2626", orange:"#ea580c",
};

// ─── Reusable Components ──────────────────────────────────────────────────────
function TI({ label, value, onChange, placeholder, type="text", error, required }) {
  return (
    <div>
      <label style={{display:"block",fontSize:12,fontWeight:600,marginBottom:4,color:C.muted}}>
        {label}{required && <span style={{color:C.accent}}> *</span>}
      </label>
      <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
        style={{width:"100%",padding:"11px 14px",borderRadius:10,fontSize:14,fontFamily:"inherit",
          border:`1.5px solid ${error?C.accent:C.border}`,background:C.card,color:C.primary,outline:"none"}} />
      {error && <p style={{color:C.accent,fontSize:11,marginTop:3}}>{error}</p>}
    </div>
  );
}

function SI({ label, value, onChange, options, error, required }) {
  return (
    <div>
      <label style={{display:"block",fontSize:12,fontWeight:600,marginBottom:4,color:C.muted}}>
        {label}{required && <span style={{color:C.accent}}> *</span>}
      </label>
      <select value={value} onChange={e=>onChange(e.target.value)}
        style={{width:"100%",padding:"11px 14px",borderRadius:10,fontSize:14,fontFamily:"inherit",
          border:`1.5px solid ${error?C.accent:C.border}`,
          background:C.card,color:value?C.primary:C.muted,outline:"none",appearance:"none"}}>
        <option value="">Select...</option>
        {options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {error && <p style={{color:C.accent,fontSize:11,marginTop:3}}>{error}</p>}
    </div>
  );
}

function Toggle({ label, value, onChange }) {
  return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
      <span style={{fontSize:14,color:C.primary}}>{label}</span>
      <div style={{display:"flex",gap:8}}>
        {["yes","no"].map(v=>(
          <button key={v} onClick={()=>onChange(v)} style={{
            padding:"6px 16px",borderRadius:8,fontSize:13,fontWeight:600,cursor:"pointer",
            background:value===v?C.primary:C.card,color:value===v?"white":C.muted,
            border:`1.5px solid ${value===v?C.primary:C.border}`,
          }}>{v==="yes"?"Yes":"No"}</button>
        ))}
      </div>
    </div>
  );
}

// ─── Shell ────────────────────────────────────────────────────────────────────
function Shell({ children }) {
  return (
    <div style={{minHeight:"100svh",background:"#e5e7eb",display:"flex",justifyContent:"center"}}>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        body,*{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif}
        ::-webkit-scrollbar{display:none}
        input,select,textarea,button{font-family:inherit}
        @keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes scaleIn{from{opacity:0;transform:scale(0.85)}to{opacity:1;transform:scale(1)}}
        .bounce0{animation:bounce 1.2s 0s infinite}
        .bounce1{animation:bounce 1.2s 0.2s infinite}
        .bounce2{animation:bounce 1.2s 0.4s infinite}
      `}</style>
      <div style={{width:"100%",maxWidth:390,minHeight:"100svh",position:"relative",overflow:"hidden",background:C.bg}}>
        {children}
      </div>
    </div>
  );
}

// ─── Scheme Card ──────────────────────────────────────────────────────────────
function SchemeCard({ scheme, onClick, profile }) {
  const d = daysLeft(scheme.deadline);
  const { eligible } = checkEligibility(scheme, profile);
  return (
    <button onClick={onClick} style={{width:"100%",textAlign:"left",background:C.card,border:`1px solid ${C.border}`,borderRadius:16,padding:14,cursor:"pointer",display:"block"}}>
      <div style={{display:"flex",alignItems:"flex-start",gap:12}}>
        <div style={{width:44,height:44,borderRadius:12,background:scheme.color,color:"white",fontWeight:800,fontSize:16,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
          {scheme.name[0]}
        </div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontWeight:700,fontSize:14,color:C.primary,lineHeight:1.3}}>{scheme.name}</div>
          <div style={{fontSize:12,color:C.muted,marginTop:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{scheme.provider}</div>
          <div style={{display:"flex",alignItems:"center",gap:8,marginTop:8,flexWrap:"wrap"}}>
            <span style={{fontSize:12,fontWeight:700,padding:"2px 8px",borderRadius:6,background:`${scheme.color}18`,color:scheme.color}}>{scheme.amount}</span>
            <span style={{fontSize:11,color:d<=7?C.accent:C.muted}}>{d>0?`${d}d left`:"Expired"}</span>
            {profile && <span style={{fontSize:11,fontWeight:700,padding:"2px 6px",borderRadius:5,background:eligible?"#dcfce7":"#fee2e2",color:eligible?"#166534":"#991b1b"}}>{eligible?"Eligible":"Not Eligible"}</span>}
          </div>
        </div>
        <span style={{fontSize:11,fontWeight:600,padding:"4px 8px",borderRadius:8,background:"#f0f9ff",color:C.accent2,flexShrink:0}}>{scheme.type}</span>
      </div>
    </button>
  );
}

// ─── Login Screen ─────────────────────────────────────────────────────────────
function LoginScreen({ onLogin, onSignup, loading }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [busy, setBusy] = useState(false);

  const validate = (e, p) => {
    const err = {};
    if (!e.trim()) err.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) err.email = "Enter a valid email address";
    if (!p) err.password = "Password is required";
    else if (p.length < 8) err.password = "Password must be at least 8 characters";
    return err;
  };

  const handleSubmit = async () => {
    const err = validate(email, password);
    setErrors(err);
    setTouched({ email: true, password: true });
    if (Object.keys(err).length) return;
    setBusy(true);
    try {
      await onLogin(email, password);
    } catch(e) {
      setErrors({ password: e.message || "Invalid email or password" });
    }
    setBusy(false);
  };

  return (
    <Shell>
      <div style={{minHeight:"100svh",display:"flex",flexDirection:"column",background:C.primary}}>
        <div style={{flex:1,background:`linear-gradient(180deg,${C.primary} 0%,#16213e 100%)`}}>
          <div style={{padding:"80px 24px 32px"}}>
            <div style={{width:56,height:56,borderRadius:16,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:18,color:"white",marginBottom:28,background:`linear-gradient(135deg,${C.accent},${C.accent2})`}}>SN</div>
            <h1 style={{fontSize:44,fontWeight:800,color:"white",lineHeight:1.05,letterSpacing:"-1px"}}>Scheme<br/>Nanban</h1>
            <p style={{color:"rgba(255,255,255,0.4)",marginTop:10,fontSize:14}}>Your AI scholarship companion</p>
          </div>
          <div style={{padding:"0 24px",display:"flex",flexDirection:"column",gap:12}}>
            <div>
              <input value={email} onChange={e=>{setEmail(e.target.value);if(touched.email)setErrors(v=>({...v,...validate(e.target.value,password)}))}}
                onBlur={()=>setTouched(t=>({...t,email:true}))} placeholder="Email address" type="email"
                style={{width:"100%",padding:"15px 16px",borderRadius:14,fontSize:15,fontFamily:"inherit",background:"rgba(255,255,255,0.08)",color:"white",outline:"none",border:`1.5px solid ${touched.email&&errors.email?"rgba(239,68,68,0.7)":"rgba(255,255,255,0.12)"}`}}/>
              {touched.email&&errors.email&&<p style={{color:"#fca5a5",fontSize:12,marginTop:4}}>{errors.email}</p>}
            </div>
            <div>
              <input value={password} onChange={e=>{setPassword(e.target.value);if(touched.password)setErrors(v=>({...v,...validate(email,e.target.value)}))}}
                onBlur={()=>setTouched(t=>({...t,password:true}))} placeholder="Password" type="password"
                style={{width:"100%",padding:"15px 16px",borderRadius:14,fontSize:15,fontFamily:"inherit",background:"rgba(255,255,255,0.08)",color:"white",outline:"none",border:`1.5px solid ${touched.password&&errors.password?"rgba(239,68,68,0.7)":"rgba(255,255,255,0.12)"}`}}/>
              {touched.password&&errors.password&&<p style={{color:"#fca5a5",fontSize:12,marginTop:4}}>{errors.password}</p>}
            </div>
            <button onClick={handleSubmit} disabled={busy||loading} style={{width:"100%",padding:"15px",borderRadius:14,fontWeight:700,fontSize:15,color:"white",cursor:"pointer",border:"none",background:`linear-gradient(135deg,${C.accent},${C.accent2})`,opacity:busy?0.7:1,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
              {busy?"Signing in...":"Sign In"}
              {!busy&&<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12,5 19,12 12,19"/></svg>}
            </button>
            <p style={{textAlign:"center",fontSize:13,color:"rgba(255,255,255,0.35)",paddingBottom:32}}>
              New here?{" "}
              <button onClick={onSignup} style={{color:C.accent2,fontWeight:600,background:"none",border:"none",cursor:"pointer",fontSize:13}}>Create Account</button>
            </p>
          </div>
        </div>
      </div>
    </Shell>
  );
}

// ─── Signup Screen ────────────────────────────────────────────────────────────
function SignupScreen({ onSuccess, onBack }) {
  const [form, setForm] = useState({firstName:"",lastName:"",email:"",phone:"",password:"",confirm:""});
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);

  const validateForm = (f) => {
    const e = {};
    if (!f.firstName.trim()) e.firstName="First name is required";
    if (!f.lastName.trim()) e.lastName="Last name is required";
    if (!f.email.trim()) e.email="Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) e.email="Enter a valid email";
    if (!/^\d{10}$/.test(f.phone)) e.phone="Enter a valid 10-digit mobile number";
    if (f.password.length<8) e.password="Minimum 8 characters required";
    else if (!/[A-Z]/.test(f.password)) e.password="At least one uppercase letter required";
    else if (!/[a-z]/.test(f.password)) e.password="At least one lowercase letter required";
    else if (!/\d/.test(f.password)) e.password="At least one number required";
    if (f.password!==f.confirm) e.confirm="Passwords do not match";
    return e;
  };

  const handleChange = (k, v) => {
    const updated = {...form, [k]: v};
    setForm(updated);
    if (submitted) setErrors(validateForm(updated));
  };

  const pwRules = [
    ["At least 8 characters", form.password.length>=8],
    ["One uppercase letter", /[A-Z]/.test(form.password)],
    ["One lowercase letter", /[a-z]/.test(form.password)],
    ["One number", /\d/.test(form.password)],
  ];

  const submit = async () => {
    setSubmitted(true);
    const e = validateForm(form);
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    try {
      await onSuccess(form);
    } catch(err) {
      setErrors({ email: err.message || "Account creation failed" });
    }
    setBusy(false);
  };

  return (
    <Shell>
      <div style={{minHeight:"100svh",display:"flex",flexDirection:"column"}}>
        <div style={{padding:"56px 20px 20px",background:C.primary}}>
          <button onClick={onBack} style={{fontSize:13,color:"rgba(255,255,255,0.5)",background:"none",border:"none",cursor:"pointer",marginBottom:12,display:"flex",alignItems:"center",gap:4}}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12,19 5,12 12,5"/></svg> Back
          </button>
          <h1 style={{fontSize:22,fontWeight:800,color:"white"}}>Create Account</h1>
          <p style={{fontSize:13,color:"rgba(255,255,255,0.4)",marginTop:4}}>Start your scholarship journey</p>
        </div>
        <div style={{flex:1,padding:"20px 20px 32px",display:"flex",flexDirection:"column",gap:14,overflowY:"auto"}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            {["firstName","lastName"].map((k,i)=>(
              <div key={k}>
                <label style={{display:"block",fontSize:12,fontWeight:600,marginBottom:4,color:C.muted}}>{i===0?"First Name":"Last Name"} <span style={{color:C.accent}}>*</span></label>
                <input value={form[k]} onChange={e=>handleChange(k,e.target.value)} placeholder={i===0?"Arjun":"Kumar"}
                  style={{width:"100%",padding:"11px 14px",borderRadius:10,fontSize:14,fontFamily:"inherit",border:`1.5px solid ${errors[k]?C.accent:C.border}`,background:C.card,color:C.primary,outline:"none"}}/>
                {errors[k]&&<p style={{color:C.accent,fontSize:11,marginTop:3}}>{errors[k]}</p>}
              </div>
            ))}
          </div>
          {[
            {k:"email",label:"Email Address",type:"email",placeholder:"arjun@email.com"},
            {k:"phone",label:"Mobile Number",type:"text",placeholder:"9876543210"},
            {k:"password",label:"Password",type:"password",placeholder:"Min 8 characters"},
            {k:"confirm",label:"Confirm Password",type:"password",placeholder:"Repeat password"},
          ].map(({k,label,type,placeholder})=>(
            <div key={k}>
              <label style={{display:"block",fontSize:12,fontWeight:600,marginBottom:4,color:C.muted}}>{label} <span style={{color:C.accent}}>*</span></label>
              <input value={form[k]} onChange={e=>handleChange(k,e.target.value)} type={type} placeholder={placeholder}
                style={{width:"100%",padding:"11px 14px",borderRadius:10,fontSize:14,fontFamily:"inherit",border:`1.5px solid ${errors[k]?C.accent:C.border}`,background:C.card,color:C.primary,outline:"none"}}/>
              {errors[k]&&<p style={{color:C.accent,fontSize:11,marginTop:3}}>{errors[k]}</p>}
            </div>
          ))}
          <div style={{borderRadius:12,padding:12,background:"#f0fdf4",border:"1px solid #bbf7d0"}}>
            {pwRules.map(([r,ok])=>(
              <div key={r} style={{display:"flex",alignItems:"center",gap:8,fontSize:12,fontWeight:500,color:ok?"#166534":"#94a3b8",marginBottom:4}}>
                {ok?<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#166534" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20,6 9,17 4,12"/></svg>:<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/></svg>}{r}
              </div>
            ))}
          </div>
          <button onClick={submit} disabled={busy} style={{width:"100%",padding:"14px",borderRadius:14,fontWeight:700,fontSize:15,color:"white",cursor:"pointer",border:"none",background:`linear-gradient(135deg,${C.accent},${C.accent2})`,opacity:busy?0.7:1}}>
            {busy?"Creating Account...":"Create Account"}
          </button>
        </div>
      </div>
    </Shell>
  );
}

// ─── Profile Setup ────────────────────────────────────────────────────────────
function ProfileSetupScreen({ user, onComplete }) {
  const [step, setStep] = useState(0);
  const [data, setData] = useState({
    dob:"",gender:"",education_level:"",college_name:"",course:"",
    year_of_study:"",family_income:"",category:"",first_graduate:"no",
    disability:"no",minority:"no",state:"Tamil Nadu",district:"",area:"Urban",
  });
  const set = (k,v) => setData(d=>({...d,[k]:v}));
  const steps = ["Personal","Education","Financial","Location"];
  const courseOptions = getCoursesByLevel(data.education_level).map(d=>({value:d,label:d}));

  const pages = [
    <div key="p" style={{display:"flex",flexDirection:"column",gap:14}}>
      <SI label="Gender" value={data.gender} onChange={v=>set("gender",v)} required options={[{value:"male",label:"Male"},{value:"female",label:"Female"},{value:"other",label:"Other"}]}/>
      <div>
        <label style={{display:"block",fontSize:12,fontWeight:600,marginBottom:4,color:C.muted}}>Date of Birth <span style={{color:C.accent}}>*</span></label>
        <input type="date" value={data.dob} onChange={e=>set("dob",e.target.value)} style={{width:"100%",padding:"11px 14px",borderRadius:10,fontSize:14,fontFamily:"inherit",border:`1.5px solid ${C.border}`,background:C.card,color:C.primary,outline:"none"}}/>
      </div>
    </div>,
    <div key="e" style={{display:"flex",flexDirection:"column",gap:14}}>
      <SI label="Education Level" value={data.education_level} onChange={v=>{set("education_level",v);set("course","");}} required
        options={[{value:"10th",label:"10th Standard"},{value:"12th",label:"12th Standard"},{value:"Diploma",label:"Diploma"},{value:"UG",label:"UG (Degree)"},{value:"PG",label:"PG (Post Graduate)"}]}/>
      <TI label="College / School Name" value={data.college_name} onChange={v=>set("college_name",v)} placeholder="e.g. Anna University" required/>
      {data.education_level && data.education_level !== "10th" && data.education_level !== "12th" ? (
        <SI label="Course / Department" value={data.course} onChange={v=>set("course",v)} required options={courseOptions}/>
      ) : null}
      <SI label="Year of Study" value={data.year_of_study} onChange={v=>set("year_of_study",v)} required
        options={[{value:"1",label:"1st Year"},{value:"2",label:"2nd Year"},{value:"3",label:"3rd Year"},{value:"4",label:"4th Year"},{value:"5",label:"5th Year"}]}/>
    </div>,
    <div key="f" style={{display:"flex",flexDirection:"column",gap:14}}>
      <TI label="Annual Family Income (Rs.)" value={data.family_income} onChange={v=>set("family_income",v)} placeholder="150000" type="number" required/>
      <SI label="Community Category" value={data.category} onChange={v=>set("category",v)} required
        options={[{value:"SC",label:"SC (Scheduled Caste)"},{value:"ST",label:"ST (Scheduled Tribe)"},{value:"BC",label:"BC (Backward Class)"},{value:"MBC",label:"MBC (Most Backward Class)"},{value:"OC",label:"OC (General)"}]}/>
      <Toggle label="First Graduate in Family?" value={data.first_graduate} onChange={v=>set("first_graduate",v)}/>
      <Toggle label="Differently Abled?" value={data.disability} onChange={v=>set("disability",v)}/>
      <Toggle label="Minority Community?" value={data.minority} onChange={v=>set("minority",v)}/>
    </div>,
    <div key="l" style={{display:"flex",flexDirection:"column",gap:14}}>
      <TI label="State" value={data.state} onChange={v=>set("state",v)} placeholder="Tamil Nadu"/>
      <SI label="District" value={data.district} onChange={v=>set("district",v)} required options={TN_DISTRICTS.map(d=>({value:d,label:d}))}/>
      <SI label="Area Type" value={data.area} onChange={v=>set("area",v)} options={[{value:"Urban",label:"Urban"},{value:"Rural",label:"Rural"}]}/>
    </div>,
  ];

  return (
    <Shell>
      <div style={{minHeight:"100svh",display:"flex",flexDirection:"column"}}>
        <div style={{padding:"56px 20px 20px",background:C.primary}}>
          <h1 style={{fontSize:20,fontWeight:800,color:"white"}}>Setup Your Profile</h1>
          <p style={{fontSize:13,color:"rgba(255,255,255,0.4)",marginTop:4}}>Helps us find your eligible schemes</p>
          <div style={{display:"flex",gap:6,marginTop:14}}>
            {steps.map((s,i)=><div key={s} style={{flex:1,height:4,borderRadius:4,background:i<=step?C.accent:"rgba(255,255,255,0.15)",transition:"background 0.3s"}}/>)}
          </div>
          <p style={{fontSize:13,fontWeight:600,color:"rgba(255,255,255,0.5)",marginTop:8}}>Step {step+1}/4 — {steps[step]} Details</p>
        </div>
        <div style={{flex:1,padding:"20px",overflowY:"auto"}}>{pages[step]}</div>
        <div style={{padding:"16px 20px 28px",display:"flex",gap:10,borderTop:`1px solid ${C.border}`,background:C.card}}>
          {step>0&&<button onClick={()=>setStep(s=>s-1)} style={{flex:1,padding:"14px",borderRadius:14,fontWeight:700,fontSize:14,cursor:"pointer",background:C.bg,color:C.primary,border:`1.5px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12,19 5,12 12,5"/></svg> Back
          </button>}
          <button onClick={()=>step<3?setStep(s=>s+1):onComplete(data)} style={{flex:2,padding:"14px",borderRadius:14,fontWeight:700,fontSize:14,color:"white",cursor:"pointer",border:"none",background:`linear-gradient(135deg,${C.accent},${C.accent2})`,display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
            {step===3?<><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>Find My Schemes</>:<>Next <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12,5 19,12 12,19"/></svg></>}
          </button>
        </div>
      </div>
    </Shell>
  );
}

// ─── Apply Modal ──────────────────────────────────────────────────────────────
function ApplyModal({ scheme, onClose, onSubmit }) {
  const [files, setFiles] = useState({ aadhaar:null, community:null, income:null });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const ALLOWED = ["application/pdf","application/msword","application/vnd.openxmlformats-officedocument.wordprocessingml.document"];

  const handleFile = (key, file) => {
    if (!file) return;
    if (!ALLOWED.includes(file.type)) { setErrors(e=>({...e,[key]:"Only PDF or Word (.doc/.docx) files are accepted."})); return; }
    if (file.size > 5*1024*1024) { setErrors(e=>({...e,[key]:"File size must be under 5MB."})); return; }
    setErrors(e=>({...e,[key]:null}));
    setFiles(f=>({...f,[key]:file}));
  };

  const handleSubmit = async () => {
    const e = {};
    if (!files.aadhaar) e.aadhaar="Aadhaar Card is required";
    if (!files.community) e.community="Community Certificate is required";
    if (!files.income) e.income="Annual Income Certificate is required";
    setErrors(e);
    if (Object.keys(e).length) return;
    setSubmitting(true);
    // Trigger the actual upload immediately (don't wait 1.8s — just show success)
    onSubmit(scheme, files); // fire-and-forget upload in background
    setSubmitting(false);
    setSuccess(true);
    setTimeout(()=>{ onClose(); }, 2000);
  };

  const FileField = ({key2, label, desc}) => (
    <div style={{borderRadius:12,border:`1.5px dashed ${errors[key2]?C.accent:files[key2]?C.green:C.border}`,padding:14,background:files[key2]?"#f0fdf4":C.bg,transition:"all 0.2s"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
        <div>
          <p style={{fontSize:13,fontWeight:600,color:C.primary}}>{label} <span style={{color:C.accent}}>*</span></p>
          <p style={{fontSize:11,color:C.muted,marginTop:1}}>{desc}</p>
        </div>
        {files[key2]&&<span style={{display:"flex",alignItems:"center",justifyContent:"center",width:22,height:22,borderRadius:"50%",background:C.green}}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20,6 9,17 4,12"/></svg></span>}
      </div>
      {files[key2]?(
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",background:"white",borderRadius:8,padding:"8px 12px",border:`1px solid ${C.green}30`}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/></svg>
            <span style={{fontSize:12,color:C.primary,fontWeight:500,maxWidth:180,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{files[key2].name}</span>
          </div>
          <button onClick={()=>setFiles(f=>({...f,[key2]:null}))} style={{fontSize:11,color:C.accent,background:"none",border:"none",cursor:"pointer",fontWeight:600}}>Remove</button>
        </div>
      ):(
        <label style={{display:"block",cursor:"pointer"}}>
          <div style={{display:"flex",alignItems:"center",gap:8,padding:"8px 12px",borderRadius:8,background:"white",border:`1px solid ${C.border}`,justifyContent:"center"}}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
            <span style={{fontSize:13,color:C.muted}}>Click to attach file</span>
          </div>
          <input type="file" accept=".pdf,.doc,.docx" style={{display:"none"}} onChange={e=>handleFile(key2, e.target.files[0])}/>
        </label>
      )}
      {errors[key2]&&<p style={{color:C.accent,fontSize:11,marginTop:6}}>{errors[key2]}</p>}
    </div>
  );

  return (
    <div style={{position:"fixed",inset:0,zIndex:1000,background:"rgba(0,0,0,0.6)",display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
      <div style={{width:"100%",maxWidth:390,background:C.card,borderRadius:"20px 20px 0 0",maxHeight:"90svh",overflow:"hidden",display:"flex",flexDirection:"column"}}>
        {success?(
          <div style={{padding:40,textAlign:"center",display:"flex",flexDirection:"column",alignItems:"center",gap:14}}>
            <div style={{width:72,height:72,borderRadius:"50%",background:"#dcfce7",display:"flex",alignItems:"center",justifyContent:"center"}}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={C.green} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22,4 12,14.01 9,11.01"/></svg>
            </div>
            <h2 style={{fontSize:22,fontWeight:800,color:C.primary}}>Applied Successfully!</h2>
            <p style={{fontSize:14,color:C.muted,lineHeight:1.6}}>Your application for <strong>{scheme.name}</strong> has been submitted. Track status in Applications tab.</p>
          </div>
        ):(
          <>
            <div style={{padding:"20px 20px 16px",borderBottom:`1px solid ${C.border}`,flexShrink:0}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <div style={{width:36,height:36,borderRadius:10,background:scheme.color,color:"white",fontWeight:800,fontSize:16,display:"flex",alignItems:"center",justifyContent:"center"}}>{scheme.name[0]}</div>
                  <div><p style={{fontSize:14,fontWeight:700,color:C.primary}}>{scheme.name}</p><p style={{fontSize:11,color:C.muted}}>{scheme.amount}</p></div>
                </div>
                <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",display:"flex",alignItems:"center",padding:4}}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
            </div>
            <div style={{flex:1,overflowY:"auto",padding:"16px 20px",display:"flex",flexDirection:"column",gap:12}}>
              <FileField key2="aadhaar" label="Aadhaar Card" desc="Soft copy of your Aadhaar card (PDF/Word)"/>
              <FileField key2="community" label="Community Certificate" desc="Issued by Tahsildar office (PDF/Word)"/>
              <FileField key2="income" label="Annual Income Certificate" desc="Current year income certificate (PDF/Word)"/>
            </div>
            <div style={{padding:"16px 20px 28px",borderTop:`1px solid ${C.border}`,background:C.card,flexShrink:0}}>
              <button onClick={handleSubmit} disabled={submitting} style={{width:"100%",padding:"15px",borderRadius:14,fontWeight:700,fontSize:15,color:"white",cursor:"pointer",border:"none",opacity:submitting?0.7:1,background:`linear-gradient(135deg,${C.accent},${C.accent2})`,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
                {submitting?"Submitting...":"Submit Application"}
                {!submitting&&<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12,5 19,12 12,19"/></svg>}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Admin Panel ──────────────────────────────────────────────────────────────
function AdminPanel({ onLogout }) {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("pending");
  const [viewingDoc, setViewingDoc] = useState(null); // {appId, fileKey, loading}
  const statusColor = { Applied:"#0891b2", "Under Review":C.yellow, Approved:C.green, Rejected:C.accent };

  useEffect(() => {
    loadApplications();
  }, []);

  const loadApplications = async () => {
    setLoading(true);
    try {
      const { db } = await initFirebase();
      const snap = await db.getDocs(db.collection(db.instance, "applications"));
      const apps = [];
      snap.forEach(doc => apps.push({ id: doc.id, ...doc.data() }));
      setApplications(apps);
    } catch(e) {
      console.error(e);
    }
    setLoading(false);
  };

  // Open document — tries Storage URL first, then chunked base64 from Firestore
  const viewDocument = async (app, fileKey) => {
    // Priority 1: Firebase Storage URL — open directly
    if (app.documents && app.documents[fileKey] && app.documents[fileKey].startsWith("http")) {
      window.open(app.documents[fileKey], "_blank");
      return;
    }

    setViewingDoc({ appId: app.id, fileKey, loading: true });
    try {
      const { db, storage } = await initFirebase();
      let fullBase64 = "";
      let fileName = (app.documentNames && app.documentNames[fileKey]) || fileKey;
      let fileType = "";

      // ── Strategy 0: Try Firebase Storage directly (reconstruct path from known pattern) ──
      if (storage && app.userId && app.schemeId && app.documentNames?.[fileKey]) {
        try {
          const docFileName = app.documentNames[fileKey];
          const storagePath = `applications/${app.userId}/${app.schemeId}/${fileKey}_${docFileName}`;
          console.log("[DocViewer] Strategy 0 — Storage:", storagePath);
          const sRef = storage.ref(storage.instance, storagePath);
          const downloadUrl = await storage.getDownloadURL(sRef);
          if (downloadUrl) {
            setViewingDoc(null);
            window.open(downloadUrl, "_blank");
            return;
          }
        } catch(storageErr) {
          console.log("[DocViewer] Strategy 0 failed:", storageErr.message);
        }
      }

      // ── Strategy 1 (CURRENT): chunks in 'applications' collection ────────────
      const newMetaSnap = await db.getDoc(
        db.doc(db.instance, "applications", `${app.id}_filemeta_${fileKey}`)
      );
      if (newMetaSnap.exists()) {
        const meta = newMetaSnap.data();
        fileName = meta.fileName || fileKey;
        fileType = meta.fileType || "";
        const totalChunks = meta.totalChunks || 1;
        for (let i = 0; i < totalChunks; i++) {
          const cSnap = await db.getDoc(
            db.doc(db.instance, "applications", `${app.id}_fc_${fileKey}_${i}`)
          );
          if (cSnap.exists()) fullBase64 += cSnap.data().data || "";
        }
      }

      // ── Strategy 2 (OLD): chunks stored in 'applicationFiles' collection ──────
      if (!fullBase64) {
        let oldMetaSnap = await db.getDoc(
          db.doc(db.instance, "applicationFiles", `${app.id}_${fileKey}`)
        );
        if (!oldMetaSnap.exists() && app.userId && app.schemeId) {
          oldMetaSnap = await db.getDoc(
            db.doc(db.instance, "applicationFiles", `${app.userId}_${app.schemeId}_${fileKey}`)
          );
        }
        if (oldMetaSnap.exists()) {
          const meta = oldMetaSnap.data();
          const usedId = oldMetaSnap.id;
          fileName = meta.fileName || fileKey;
          fileType = meta.fileType || "";
          const totalChunks = meta.totalChunks || 1;
          // backward compat: old-old format stored chunk_0 inside metadata doc
          fullBase64 = meta.chunk_0 || "";
          const startIdx = fullBase64 ? 1 : 0;
          for (let i = startIdx; i < totalChunks; i++) {
            const cSnap = await db.getDoc(
              db.doc(db.instance, "applicationFiles", `${usedId}_chunk${i}`)
            );
            if (cSnap.exists()) fullBase64 += cSnap.data().data || "";
          }
        }
      }

      setViewingDoc(null);

      if (!fullBase64) {
        alert(
          `Document "${fileName}" was not found.\n\n` +
          `This usually means the document upload failed when the application was submitted.\n` +
          `Ask the applicant to re-submit their application to re-upload documents.`
        );
        return;
      }

      // ── Convert base64 → Blob URL (reliable, bypasses popup blockers) ─────────
      try {
        const parts = fullBase64.split(',');
        const mimeMatch = parts[0].match(/:(.*?);/);
        const mime = mimeMatch ? mimeMatch[1] : (fileType || 'application/octet-stream');
        const binary = atob(parts[1]);
        const bytes = new Uint8Array(binary.length);
        for (let j = 0; j < binary.length; j++) bytes[j] = binary.charCodeAt(j);
        const blob = new Blob([bytes], { type: mime });
        const blobUrl = URL.createObjectURL(blob);
        const opened = window.open(blobUrl, '_blank');
        if (!opened) {
          // Popup blocked — auto-download instead
          const a = document.createElement('a');
          a.href = blobUrl; a.download = fileName;
          document.body.appendChild(a); a.click(); document.body.removeChild(a);
          alert(`Popup blocked. "${fileName}" is being downloaded.`);
        }
        setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
      } catch (blobErr) {
        // Last resort: open data URI in new window
        const isPdf = fullBase64.startsWith('data:application/pdf');
        const isImg = fullBase64.startsWith('data:image');
        const win = window.open("", "_blank");
        if (win) {
          win.document.write(`<!DOCTYPE html><html><head><title>${fileName}</title>
            <style>*{margin:0;padding:0;box-sizing:border-box}body{background:#1e293b;font-family:system-ui}
            .bar{position:fixed;top:0;left:0;right:0;padding:12px 20px;background:#0f172a;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #334155}
            .bar h3{color:white;font-size:15px;font-weight:700}.dl{padding:8px 16px;background:#e63946;color:white;border:none;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;text-decoration:none}
            embed{width:100%;height:calc(100vh-50px);margin-top:50px;border:none}img{max-width:100%;margin:70px auto;display:block}
            .msg{color:white;padding:80px 20px;text-align:center}.msg p{color:#94a3b8;margin-top:10px}</style></head>
            <body><div class="bar"><h3>${fileName}</h3><a href="${fullBase64}" download="${fileName}" class="dl">⬇ Download</a></div>
            ${isPdf?`<embed src="${fullBase64}" type="application/pdf"/>`:isImg?`<img src="${fullBase64}"/>`:`<div class="msg"><h3>${fileName}</h3><p>Cannot preview. Please download.</p><br><a href="${fullBase64}" download="${fileName}" class="dl">⬇ Download</a></div>`}
            </body></html>`);
          win.document.close();
        }
      }
    } catch(e) {
      console.error("[DocViewer] Error:", e);
      setViewingDoc(null);
      alert("Failed to load document: " + e.message);
    }
  };

  const updateStatus = async (appId, newStatus) => {
    try {
      const { db } = await initFirebase();
      await db.updateDoc(db.doc(db.instance, "applications", appId), { status: newStatus });
      setApplications(prev => prev.map(a => a.id === appId ? {...a, status: newStatus} : a));
    } catch(e) { alert("Failed to update: " + e.message); }
  };

  const deleteApplication = async (app) => {
    if (!window.confirm(`Delete application by "${app.userName}" for "${app.schemeName}"?\nThis cannot be undone.`)) return;
    try {
      const { db } = await initFirebase();
      const CHUNK_SIZE = 750000;
      // Delete file chunks and metadata for each document
      const fileKeys = Object.keys(app.documentNames || {});
      for (const key of fileKeys) {
        // Delete metadata doc
        try { await db.deleteDoc(db.doc(db.instance, "applications", `${app.id}_filemeta_${key}`)); } catch(_){}
        // Delete chunk docs (try up to 20 chunks)
        for (let i = 0; i < 20; i++) {
          try { await db.deleteDoc(db.doc(db.instance, "applications", `${app.id}_fc_${key}_${i}`)); } catch(_){ break; }
        }
      }
      // Delete main application doc
      await db.deleteDoc(db.doc(db.instance, "applications", app.id));
      setApplications(prev => prev.filter(a => a.id !== app.id));
    } catch(e) { alert("Failed to delete: " + e.message); }
  };

  const filtered = applications.filter(a => {
    if (tab === "pending") return a.status === "Applied" || a.status === "Under Review";
    if (tab === "approved") return a.status === "Approved";
    if (tab === "rejected") return a.status === "Rejected";
    return true;
  });

  return (
    <Shell>
      <div style={{minHeight:"100svh",display:"flex",flexDirection:"column",background:C.bg}}>
        <div style={{padding:"52px 16px 16px",background:C.primary,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div>
            <div style={{fontSize:11,color:"rgba(255,255,255,0.4)",fontWeight:600,textTransform:"uppercase",letterSpacing:"0.08em"}}>Admin Panel</div>
            <div style={{fontSize:18,fontWeight:800,color:"white",marginTop:2}}>SchemeNanban</div>
          </div>
          <button onClick={onLogout} style={{padding:"8px 14px",borderRadius:10,fontSize:12,fontWeight:700,cursor:"pointer",background:"rgba(255,255,255,0.1)",color:"rgba(255,255,255,0.7)",border:"1px solid rgba(255,255,255,0.15)"}}>Logout</button>
        </div>

        <div style={{display:"flex",gap:0,background:C.primary,padding:"0 16px 0"}}>
          {[["pending","Pending"],["approved","Approved"],["rejected","Rejected"],["all","All"]].map(([id,label])=>(
            <button key={id} onClick={()=>setTab(id)} style={{flex:1,padding:"10px 4px",fontSize:12,fontWeight:700,cursor:"pointer",background:"none",border:"none",color:tab===id?"white":"rgba(255,255,255,0.35)",borderBottom:tab===id?`2px solid ${C.accent2}`:"2px solid transparent"}}>
              {label}
              <span style={{marginLeft:4,fontSize:10,background:"rgba(255,255,255,0.15)",padding:"1px 5px",borderRadius:8}}>
                {id==="all"?applications.length:applications.filter(a=>id==="pending"?(a.status==="Applied"||a.status==="Under Review"):a.status===(id==="approved"?"Approved":"Rejected")).length}
              </span>
            </button>
          ))}
        </div>

        <div style={{flex:1,overflowY:"auto",padding:16}}>
          {loading?(
            <div style={{textAlign:"center",padding:"60px 0",color:C.muted}}>Loading applications...</div>
          ):filtered.length===0?(
            <div style={{textAlign:"center",padding:"60px 0"}}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={C.border} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{margin:"0 auto 12px",display:"block"}}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/></svg>
              <p style={{fontWeight:700,color:C.primary}}>No applications here</p>
            </div>
          ):(
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              {filtered.map(app=>(
                <div key={app.id} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:16,padding:14}}>
                  <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:10}}>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontWeight:700,fontSize:14,color:C.primary}}>{app.schemeName}</div>
                      <div style={{fontSize:12,color:C.muted,marginTop:2}}>{app.userName} · {app.userEmail}</div>
                      <div style={{fontSize:11,color:C.muted,marginTop:1}}>Applied: {app.appliedDate}</div>
                    </div>
                    <span style={{fontSize:11,fontWeight:700,padding:"4px 10px",borderRadius:8,flexShrink:0,background:`${statusColor[app.status]||C.muted}18`,color:statusColor[app.status]||C.muted}}>{app.status}</span>
                  </div>
                  {app.userProfile && (
                    <div style={{background:C.bg,borderRadius:10,padding:10,marginBottom:10,fontSize:12,color:C.muted,display:"flex",flexWrap:"wrap",gap:"4px 16px"}}>
                      <span>Category: <strong style={{color:C.primary}}>{app.userProfile.category}</strong></span>
                      <span>Income: <strong style={{color:C.primary}}>Rs.{parseInt(app.userProfile.family_income||0).toLocaleString("en-IN")}</strong></span>
                      <span>Education: <strong style={{color:C.primary}}>{app.userProfile.education_level}</strong></span>
                      <span>District: <strong style={{color:C.primary}}>{app.userProfile.district}</strong></span>
                    </div>
                  )}
                  {(() => {
                    const hasUrls = app.documents && Object.keys(app.documents).length > 0;
                    const hasFileNames = app.documentNames && Object.keys(app.documentNames).length > 0;
                    const docLabels = {aadhaar:"Aadhaar Card",community:"Community Certificate",income:"Income Certificate"};
                    const allKeys = new Set([
                      ...(app.documents ? Object.keys(app.documents) : []),
                      ...(app.documentNames ? Object.keys(app.documentNames) : []),
                    ]);
                    if (allKeys.size > 0) return (
                      <div style={{background:"#f0f9ff",borderRadius:10,padding:10,marginBottom:10,border:"1px solid #bae6fd"}}>
                        <p style={{fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",color:"#0369a1",marginBottom:6,display:"flex",alignItems:"center",gap:4}}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#0369a1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                          Attached Documents ({allKeys.size})
                        </p>
                        <div style={{display:"flex",flexDirection:"column",gap:4}}>
                          {[...allKeys].map(key => {
                            const fileName = (app.documentNames && app.documentNames[key]) || key;
                            const isLoading = viewingDoc && viewingDoc.appId === app.id && viewingDoc.fileKey === key && viewingDoc.loading;
                            return (
                              <button key={key} onClick={() => !isLoading && viewDocument(app, key)}
                                style={{display:"flex",alignItems:"center",gap:8,padding:"10px 12px",borderRadius:8,background:"white",border:"1px solid #e0f2fe",fontSize:12,color:C.primary,fontWeight:500,cursor:isLoading?"wait":"pointer",width:"100%",textAlign:"left",transition:"all 0.15s",outline:"none"}}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0369a1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/></svg>
                                <div style={{flex:1,minWidth:0}}>
                                  <div style={{fontWeight:600,fontSize:13}}>{docLabels[key]||key}</div>
                                  <div style={{fontSize:11,color:C.muted,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{fileName}</div>
                                </div>
                                <span style={{flexShrink:0,fontSize:11,color:"#0369a1",fontWeight:700,padding:"5px 12px",borderRadius:8,background:isLoading?"#fef9c3":"#dbeafe",color:isLoading?C.yellow:"#0369a1",display:"flex",alignItems:"center",gap:4}}>
                                  {isLoading ? (
                                    <>Loading...</>
                                  ) : (
                                    <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>Open &amp; View</>
                                  )}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                    return null;
                  })()}
                  <div style={{display:"flex",gap:8}}>
                    {app.status !== "Approved" && (
                      <button onClick={()=>updateStatus(app.id,"Approved")} style={{flex:1,padding:"9px",borderRadius:10,fontSize:12,fontWeight:700,cursor:"pointer",background:`${C.green}15`,color:C.green,border:`1.5px solid ${C.green}40`}}>
                        Approve
                      </button>
                    )}
                    {app.status !== "Under Review" && app.status !== "Approved" && (
                      <button onClick={()=>updateStatus(app.id,"Under Review")} style={{flex:1,padding:"9px",borderRadius:10,fontSize:12,fontWeight:700,cursor:"pointer",background:`${C.yellow}15`,color:C.yellow,border:`1.5px solid ${C.yellow}40`}}>
                        Review
                      </button>
                    )}
                    {app.status !== "Rejected" && (
                      <button onClick={()=>updateStatus(app.id,"Rejected")} style={{flex:1,padding:"9px",borderRadius:10,fontSize:12,fontWeight:700,cursor:"pointer",background:`${C.accent}10`,color:C.accent,border:`1.5px solid ${C.accent}30`}}>
                        Reject
                      </button>
                    )}
                    {(app.status === "Approved" || app.status === "Rejected") && (
                      <button onClick={()=>deleteApplication(app)} title="Delete this application"
                        style={{padding:"9px 12px",borderRadius:10,fontSize:12,fontWeight:700,cursor:"pointer",background:"#fee2e2",color:"#dc2626",border:"1.5px solid #fca5a5",display:"flex",alignItems:"center",gap:5}}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3,6 5,6 21,6"/><path d="M19,6v14a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6m3,0V4a2,2,0,0,1,2-2h4a2,2,0,0,1,2,2v2"/></svg>
                        Delete
                      </button>
                    )}
                    <button onClick={loadApplications} style={{padding:"9px 12px",borderRadius:10,fontSize:12,fontWeight:700,cursor:"pointer",background:C.bg,color:C.muted,border:`1.5px solid ${C.border}`}}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23,4 23,10 17,10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Shell>
  );
}

// ─── Home Tab ─────────────────────────────────────────────────────────────────
function HomeTab({ matched, applications, user, profile, onBrowse, onChat, onScheme }) {
  const pending = applications.filter(a=>["Applied","Under Review"].includes(a.status)).length;
  const approved = applications.filter(a=>a.status==="Approved").length;
  return (
    <div style={{padding:"16px",display:"flex",flexDirection:"column",gap:16}}>
      <div style={{borderRadius:20,padding:20,background:`linear-gradient(135deg,${C.primary} 0%,#16213e 60%,#0f3460 100%)`,position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",right:-24,top:-24,width:100,height:100,borderRadius:"50%",background:C.accent,opacity:0.1}}/>
        <p style={{fontSize:12,color:"rgba(255,255,255,0.5)",fontWeight:600}}>Welcome back</p>
        <h2 style={{fontSize:28,fontWeight:800,color:"white",marginTop:4,lineHeight:1}}>{user?.firstName||"Student"}!</h2>
        <p style={{fontSize:13,color:"rgba(255,255,255,0.4)",marginTop:6}}>{profile?`${matched.length} schemes matched your profile`:"Complete your profile to discover eligible schemes"}</p>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        {[
          {l:"Matched",v:matched.length,col:C.accent,icon:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>},
          {l:"Applied",v:applications.length,col:"#7c3aed",icon:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/></svg>},
          {l:"Pending",v:pending,col:C.yellow,icon:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.yellow} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg>},
          {l:"Approved",v:approved,col:C.green,icon:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.green} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22,4 12,14.01 9,11.01"/></svg>},
        ].map(({l,v,col,icon})=>(
          <div key={l} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:14}}>
            <div>{icon}</div>
            <div style={{fontSize:28,fontWeight:800,color:col,marginTop:4}}>{v}</div>
            <div style={{fontSize:12,color:C.muted,marginTop:2}}>{l}</div>
          </div>
        ))}
      </div>
      <div>
        <p style={{fontSize:12,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",color:C.muted,marginBottom:10}}>Quick Actions</p>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <button onClick={onBrowse} style={{background:`${C.accent}0d`,border:`1.5px solid ${C.accent}25`,borderRadius:14,padding:14,cursor:"pointer",textAlign:"left"}}>
            <div style={{marginBottom:8}}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></div>
            <div style={{fontSize:13,fontWeight:700,color:C.primary}}>Browse Schemes</div>
            <div style={{fontSize:11,color:C.muted,marginTop:2}}>{SCHEMES.length} available</div>
          </button>
          <button onClick={onChat} style={{background:"#7c3aed0d",border:"1.5px solid #7c3aed25",borderRadius:14,padding:14,cursor:"pointer",textAlign:"left"}}>
            <div style={{marginBottom:8}}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></div>
            <div style={{fontSize:13,fontWeight:700,color:C.primary}}>AI Assistant</div>
            <div style={{fontSize:11,color:C.muted,marginTop:2}}>Ask anything</div>
          </button>
        </div>
      </div>
      {matched.length>0&&(
        <div>
          <p style={{fontSize:12,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",color:C.muted,marginBottom:10}}>Matched For You ({matched.length})</p>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {matched.slice(0,4).map(s=><SchemeCard key={s.id} scheme={s} onClick={()=>onScheme(s)} profile={profile}/>)}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Browse Tab ───────────────────────────────────────────────────────────────
function BrowseTab({ schemes, filter, search, profile, onFilter, onSearch, onSelect }) {
  const filters = ["All","Scholarship","Grant","Fellowship"];
  return (
    <div style={{padding:"16px",display:"flex",flexDirection:"column",gap:14}}>
      <h2 style={{fontSize:20,fontWeight:800,color:C.primary}}>Browse Schemes</h2>
      <input value={search} onChange={e=>onSearch(e.target.value)} placeholder="Search by name or provider..."
        style={{width:"100%",padding:"11px 14px",borderRadius:12,fontSize:14,fontFamily:"inherit",background:C.card,border:`1.5px solid ${C.border}`,color:C.primary,outline:"none"}}/>
      <div style={{display:"flex",gap:8,overflowX:"auto",paddingBottom:2}}>
        {filters.map(f=><button key={f} onClick={()=>onFilter(f)} style={{flexShrink:0,padding:"7px 14px",borderRadius:10,fontSize:13,fontWeight:600,cursor:"pointer",background:filter===f?C.primary:C.card,color:filter===f?"white":C.muted,border:`1.5px solid ${filter===f?C.primary:C.border}`}}>{f}</button>)}
      </div>
      <p style={{fontSize:12,color:C.muted}}>{schemes.length} schemes found</p>
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {schemes.length?schemes.map(s=><SchemeCard key={s.id} scheme={s} onClick={()=>onSelect(s)} profile={profile}/>):(
          <div style={{textAlign:"center",padding:"60px 0",color:C.muted}}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={C.border} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{margin:"0 auto 12px",display:"block"}}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <p style={{fontWeight:700,color:C.primary}}>No schemes found</p>
            <p style={{fontSize:13,marginTop:4}}>Try a different search or filter</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Chat Tab ─────────────────────────────────────────────────────────────────
function ChatTab({ messages, input, loading, onInput, onSend, chatEndRef }) {
  const prompts = ["Am I eligible for any scheme?","Documents needed?","Upcoming deadlines?","Pudhumai Penn details?"];
  return (
    <div style={{display:"flex",flexDirection:"column",height:"calc(100svh - 200px)"}}>
      <div style={{padding:"16px 16px 10px",flexShrink:0}}>
        <h2 style={{fontSize:20,fontWeight:800,color:C.primary,display:"flex",alignItems:"center",gap:8}}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          AI Assistant
        </h2>
        <p style={{fontSize:12,color:C.muted,marginTop:2}}>I'm SchemeNanban AI · Ask about any scheme</p>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"8px 16px",display:"flex",flexDirection:"column",gap:10}}>
        {messages.map((m,i)=>(
          <div key={i} style={{display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start"}}>
            <div style={{maxWidth:"85%",borderRadius:16,padding:"11px 14px",fontSize:14,lineHeight:1.55,background:m.role==="user"?`linear-gradient(135deg,${C.accent},${C.accent2})`:C.card,color:m.role==="user"?"white":C.primary,border:m.role==="assistant"?`1px solid ${C.border}`:"none"}}>
              {m.content}
            </div>
          </div>
        ))}
        {loading&&(
          <div style={{display:"flex",justifyContent:"flex-start"}}>
            <div style={{borderRadius:16,padding:"14px 16px",background:C.card,border:`1px solid ${C.border}`}}>
              <div style={{display:"flex",gap:5}}>
                <div className="bounce0" style={{width:7,height:7,borderRadius:"50%",background:C.muted}}/>
                <div className="bounce1" style={{width:7,height:7,borderRadius:"50%",background:C.muted}}/>
                <div className="bounce2" style={{width:7,height:7,borderRadius:"50%",background:C.muted}}/>
              </div>
            </div>
          </div>
        )}
        <div ref={chatEndRef}/>
      </div>
      <div style={{padding:"8px 16px 12px",flexShrink:0}}>
        <div style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:8}}>
          {prompts.map(p=><button key={p} onClick={()=>onInput(p)} style={{flexShrink:0,fontSize:12,padding:"6px 12px",borderRadius:20,cursor:"pointer",background:C.card,border:`1px solid ${C.border}`,color:C.muted,whiteSpace:"nowrap"}}>{p}</button>)}
        </div>
        <div style={{display:"flex",gap:8}}>
          <input value={input} onChange={e=>onInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&!loading&&input.trim()&&onSend()}
            placeholder="Ask about scholarships..."
            style={{flex:1,padding:"12px 14px",borderRadius:14,fontSize:14,fontFamily:"inherit",background:C.card,border:`1.5px solid ${C.border}`,color:C.primary,outline:"none"}}/>
          <button onClick={onSend} disabled={loading||!input.trim()} style={{width:46,height:46,borderRadius:13,display:"flex",alignItems:"center",justifyContent:"center",cursor:loading||!input.trim()?"not-allowed":"pointer",border:"none",background:`linear-gradient(135deg,${C.accent},${C.accent2})`,opacity:loading||!input.trim()?0.5:1,flexShrink:0}}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5,12 12,5 19,12"/></svg>
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Applications Tab ─────────────────────────────────────────────────────────
function ApplicationsTab({ applications, onSelect }) {
  const sColor = { Applied:"#0891b2","Under Review":C.yellow,Approved:C.green,Rejected:C.accent };
  return (
    <div style={{padding:"16px",display:"flex",flexDirection:"column",gap:14}}>
      <h2 style={{fontSize:20,fontWeight:800,color:C.primary}}>My Applications</h2>
      {applications.length===0?(
        <div style={{textAlign:"center",padding:"60px 0"}}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={C.border} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{margin:"0 auto 12px",display:"block"}}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/></svg>
          <p style={{fontWeight:700,fontSize:16,color:C.primary}}>No applications yet</p>
          <p style={{fontSize:14,color:C.muted,marginTop:6}}>Browse schemes and apply to track here</p>
        </div>
      ):(
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {applications.map(app=>(
            <button key={app.id} onClick={()=>onSelect(app.scheme)} style={{width:"100%",textAlign:"left",background:C.card,border:`1px solid ${C.border}`,borderRadius:16,padding:14,cursor:"pointer"}}>
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                <div style={{width:44,height:44,borderRadius:12,background:app.scheme.color,color:"white",fontWeight:800,fontSize:16,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{app.scheme.name[0]}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:700,fontSize:14,color:C.primary}}>{app.scheme.name}</div>
                  <div style={{fontSize:12,color:C.muted,marginTop:2}}>Applied {app.applied_date}</div>
                </div>
                <span style={{fontSize:11,fontWeight:700,padding:"4px 10px",borderRadius:8,flexShrink:0,background:`${sColor[app.status]}18`,color:sColor[app.status]}}>{app.status}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Profile Tab ──────────────────────────────────────────────────────────────
function ProfileTab({ user, profile, editMode, onEdit, onSave, onLogout }) {
  const [form, setForm] = useState(profile || {});
  const setF = useCallback((k,v)=>setForm(f=>({...f,[k]:v})),[]);
  const courseOptions = getCoursesByLevel(form.education_level || profile?.education_level || "").map(d=>({value:d,label:d}));

  if (!profile) return (
    <div style={{textAlign:"center",padding:"60px 16px"}}>
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={C.border} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{margin:"0 auto 10px",display:"block"}}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
      <p style={{fontWeight:700,color:C.primary}}>No profile data found</p>
    </div>
  );

  const initials = [user?.firstName,user?.lastName].filter(Boolean).map(n=>n[0]).join("").toUpperCase()||"S";
  const fullName = [user?.firstName,user?.lastName].filter(Boolean).join(" ")||"Student";

  return (
    <div style={{padding:"16px",display:"flex",flexDirection:"column",gap:14}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <h2 style={{fontSize:20,fontWeight:800,color:C.primary}}>My Profile</h2>
        <div style={{display:"flex",gap:8}}>
          {!editMode&&<button onClick={onEdit} style={{padding:"8px 14px",borderRadius:10,fontSize:12,fontWeight:700,cursor:"pointer",background:C.primary,color:"white",border:"none",display:"flex",alignItems:"center",gap:6}}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            Edit
          </button>}
          <button onClick={onLogout} style={{padding:"8px 14px",borderRadius:10,fontSize:12,fontWeight:700,cursor:"pointer",background:"#fee2e2",color:C.accent,border:"none"}}>Logout</button>
        </div>
      </div>
      <div style={{borderRadius:18,padding:16,display:"flex",alignItems:"center",gap:14,background:`linear-gradient(135deg,${C.primary},#16213e)`}}>
        <div style={{width:54,height:54,borderRadius:14,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:20,color:"white",background:`linear-gradient(135deg,${C.accent},${C.accent2})`}}>{initials}</div>
        <div>
          <div style={{fontWeight:800,color:"white",fontSize:16}}>{fullName}</div>
          <div style={{fontSize:12,color:"rgba(255,255,255,0.4)",marginTop:2}}>{user?.email}</div>
          <div style={{display:"flex",gap:6,marginTop:8,flexWrap:"wrap"}}>
            <span style={{fontSize:11,padding:"3px 8px",borderRadius:6,fontWeight:700,background:`${C.accent}30`,color:C.accent2}}>{profile.category}</span>
            <span style={{fontSize:11,padding:"3px 8px",borderRadius:6,fontWeight:700,background:"rgba(255,255,255,0.1)",color:"rgba(255,255,255,0.6)"}}>{profile.education_level}</span>
          </div>
        </div>
      </div>
      {editMode?(
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <SI label="Gender" value={form.gender} onChange={v=>setF("gender",v)} options={[{value:"male",label:"Male"},{value:"female",label:"Female"},{value:"other",label:"Other"}]}/>
          <SI label="Education Level" value={form.education_level} onChange={v=>{setF("education_level",v);setF("course","");}} options={[{value:"10th",label:"10th"},{value:"12th",label:"12th"},{value:"Diploma",label:"Diploma"},{value:"UG",label:"UG"},{value:"PG",label:"PG"}]}/>
          <TI label="College Name" value={form.college_name||""} onChange={v=>setF("college_name",v)} placeholder="College name"/>
          {form.education_level && form.education_level !== "10th" && form.education_level !== "12th" && (
            <SI label="Course / Department" value={form.course||""} onChange={v=>setF("course",v)} options={courseOptions}/>
          )}
          <TI label="Annual Income (Rs.)" value={form.family_income||""} onChange={v=>setF("family_income",v)} placeholder="150000" type="number"/>
          <SI label="Category" value={form.category} onChange={v=>setF("category",v)} options={[{value:"SC",label:"SC"},{value:"ST",label:"ST"},{value:"BC",label:"BC"},{value:"MBC",label:"MBC"},{value:"OC",label:"OC"}]}/>
          <Toggle label="First Graduate?" value={form.first_graduate||"no"} onChange={v=>setF("first_graduate",v)}/>
          <Toggle label="Differently Abled?" value={form.disability||"no"} onChange={v=>setF("disability",v)}/>
          <Toggle label="Minority Community?" value={form.minority||"no"} onChange={v=>setF("minority",v)}/>
          <SI label="District" value={form.district||""} onChange={v=>setF("district",v)} options={TN_DISTRICTS.map(d=>({value:d,label:d}))}/>
          <button onClick={()=>onSave(form)} style={{width:"100%",padding:"14px",borderRadius:14,fontWeight:700,fontSize:14,color:"white",cursor:"pointer",border:"none",background:`linear-gradient(135deg,${C.accent},${C.accent2})`}}>Save Changes</button>
        </div>
      ):(
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {[
            {title:"Personal",rows:[["Gender",profile.gender],["Date of Birth",profile.dob]]},
            {title:"Education",rows:[["Level",profile.education_level],["College",profile.college_name],["Course",profile.course],["Year",profile.year_of_study&&`Year ${profile.year_of_study}`]]},
            {title:"Financial",rows:[["Annual Income",profile.family_income&&`Rs.${parseInt(profile.family_income).toLocaleString("en-IN")}`],["Category",profile.category],["First Graduate",profile.first_graduate],["Disability",profile.disability],["Minority",profile.minority]]},
            {title:"Location",rows:[["District",profile.district],["State",profile.state],["Area",profile.area]]},
          ].map(({title,rows})=>(
            <div key={title} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,overflow:"hidden"}}>
              <div style={{padding:"10px 16px",borderBottom:`1px solid ${C.border}`,background:"#fafafa"}}>
                <span style={{fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",color:C.muted}}>{title}</span>
              </div>
              {rows.filter(([,v])=>v).map(([k,v])=>(
                <div key={k} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"11px 16px",borderBottom:`1px solid ${C.border}`}}>
                  <span style={{fontSize:12,color:C.muted}}>{k}</span>
                  <span style={{fontSize:13,fontWeight:600,color:C.primary,textTransform:"capitalize",textAlign:"right",maxWidth:"60%"}}>{v}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function SchemeNanban() {
  const [screen, setScreen] = useState("loading"); // loading | login | signup | profile-setup | app | admin
  const [tab, setTab] = useState("home");
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [applications, setApplications] = useState([]);
  const [selectedScheme, setSelectedScheme] = useState(null);
  const [applyModal, setApplyModal] = useState(null);
  const [notification, setNotification] = useState(null);
  const [chatMessages, setChatMessages] = useState([
    {role:"assistant",content:"Hi! I'm your SchemeNanban AI. Ask me about scholarships you're eligible for!"}
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [profileEditMode, setProfileEditMode] = useState(false);
  const [showNotif, setShowNotif] = useState(false);
  const chatEndRef = useRef(null);
  const matched = getMatchedSchemes(profile);

  useEffect(()=>{ chatEndRef.current?.scrollIntoView({behavior:"smooth"}); }, [chatMessages]);

  // ── Auth State Listener (persistent login) ────────────────────────────────
  useEffect(() => {
    let unsubscribe = null;
    (async () => {
      try {
        const { auth, db } = await initFirebase();
        unsubscribe = auth.onAuthStateChanged(auth.instance, async (firebaseUser) => {
          if (firebaseUser) {
            // Check admin
            if (firebaseUser.email === ADMIN_EMAIL) {
              setScreen("admin");
              return;
            }
            // Load user profile from Firestore
            try {
              const userDoc = await db.getDoc(db.doc(db.instance, "users", firebaseUser.uid));
              const userData = userDoc.data() || {};
              setUser({ firstName: userData.firstName||"", lastName: userData.lastName||"", email: firebaseUser.email, phone: userData.phone||"", uid: firebaseUser.uid });
              if (userData.profile) {
                setProfile(userData.profile);
                // Load applications
                const appsSnap = await db.getDocs(db.query(db.collection(db.instance,"applications"), db.where("userId","==",firebaseUser.uid)));
                const apps = [];
                appsSnap.forEach(d => {
                  const data = d.data();
                  const scheme = SCHEMES.find(s=>s.id===data.schemeId);
                  if (scheme) apps.push({ id:d.id, scheme, status:data.status, applied_date:data.appliedDate });
                });
                setApplications(apps);
                setScreen("app");
              } else {
                setScreen("profile-setup");
              }
            } catch(e) {
              setScreen("profile-setup");
            }
          } else {
            setScreen("login");
          }
        });
      } catch(e) {
        setScreen("login");
      }
    })();
    return () => unsubscribe && unsubscribe();
  }, []);

  const notify = (msg, type="success") => {
    setNotification({msg,type});
    setTimeout(()=>setNotification(null), 3500);
  };

  // ── Firebase Login ─────────────────────────────────────────────────────────
  const handleLogin = async (email, password) => {
    const { auth } = await initFirebase();

    // Admin login — authenticate via Firebase so Firestore queries work
    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      try {
        await auth.signInWithEmailAndPassword(auth.instance, email, password);
      } catch(e) {
        // Auto-create admin account if it doesn't exist yet
        if (e.code === "auth/user-not-found" || e.code === "auth/invalid-credential") {
          try {
            await auth.createUserWithEmailAndPassword(auth.instance, email, password);
          } catch(createErr) {
            // Account might exist with different password; try updating
            console.warn("Admin account setup:", createErr.message);
          }
        }
      }
      setScreen("admin");
      return;
    }

    // Regular user login
    await auth.signInWithEmailAndPassword(auth.instance, email, password);
    // onAuthStateChanged will handle the rest
  };

  // ── Firebase Signup ────────────────────────────────────────────────────────
  const handleSignup = async (formData) => {
    const { auth, db } = await initFirebase();
    const cred = await auth.createUserWithEmailAndPassword(auth.instance, formData.email, formData.password);
    await db.setDoc(db.doc(db.instance, "users", cred.user.uid), {
      firstName: formData.firstName,
      lastName: formData.lastName,
      phone: formData.phone,
      email: formData.email,
      createdAt: new Date().toISOString(),
    });
    setUser({ firstName:formData.firstName, lastName:formData.lastName, email:formData.email, phone:formData.phone, uid:cred.user.uid });
    setScreen("profile-setup");
  };

  // ── Save Profile to Firestore ──────────────────────────────────────────────
  const handleProfileComplete = async (profileData) => {
    try {
      if (user?.uid) {
        const { db } = await initFirebase();
        await db.updateDoc(db.doc(db.instance, "users", user.uid), { profile: profileData });
      }
    } catch(e) { console.error(e); }
    setProfile(profileData);
    setScreen("app");
    notify("Profile saved! Discovering your eligible schemes...");
  };

  // ── Save Application to Firestore (with document upload) ───────────────────
  const handleApplySubmit = async (scheme, files) => {
    if (applications.find(a=>a.scheme.id===scheme.id)) return;
    const newApp = { id:Date.now(), scheme, status:"Applied", applied_date:new Date().toLocaleDateString("en-IN") };
    setApplications(prev=>[...prev, newApp]);

    // Collect file names for metadata (even if upload fails)
    const documentNames = {};
    if (files) {
      for (const [key, file] of Object.entries(files)) {
        if (file) documentNames[key] = file.name;
      }
    }

    const appDocId = `${user?.uid}_${scheme.id}`;

    // Step 1: Save application to Firestore IMMEDIATELY (before uploading files)
    try {
      if (user?.uid) {
        const { db } = await initFirebase();
        await db.setDoc(db.doc(db.instance, "applications", appDocId), {
          userId: user.uid,
          userName: `${user.firstName} ${user.lastName}`.trim(),
          userEmail: user.email,
          userProfile: profile,
          schemeId: scheme.id,
          schemeName: scheme.name,
          status: "Applied",
          appliedDate: new Date().toLocaleDateString("en-IN"),
          createdAt: new Date().toISOString(),
          documents: {},
          documentNames: documentNames,
        });
      }
    } catch(e) { console.error("Failed to save application:", e); }

    // Step 2: Save documents directly as base64 in Firestore 'applications' collection.
    // Firebase Storage is skipped — it requires extra CORS + Storage rules config.
    // Using 'applications' (same collection as the main app doc) means the admin
    // can always read them with the Firestore rules already published.
    try {
      if (user?.uid && files) {
        const { db } = await initFirebase();
        for (const [key, file] of Object.entries(files)) {
          if (!file) continue;
          try {
            const base64DataUrl = await fileToBase64(file);
            const CHUNK_SIZE = 750000;
            const totalChunks = Math.ceil(base64DataUrl.length / CHUNK_SIZE);
            await db.setDoc(db.doc(db.instance, "applications", `${appDocId}_filemeta_${key}`), {
              appId: appDocId, fileKey: key, fileName: file.name,
              fileType: file.type, fileSize: file.size,
              totalChunks: totalChunks, createdAt: new Date().toISOString(),
            });
            for (let i = 0; i < totalChunks; i++) {
              await db.setDoc(
                db.doc(db.instance, "applications", `${appDocId}_fc_${key}_${i}`),
                { data: base64DataUrl.substring(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE) }
              );
            }
            console.log(`[Upload] ✅ ${key} (${file.name}) saved — ${totalChunks} chunk(s)`);
          } catch(fileErr) {
            console.error(`[Upload] ❌ ${key} failed:`, fileErr.message);
          }
        }
      }
    } catch(e) { console.error("[Upload] Error:", e); }

    notify(`Applied to ${scheme.name} successfully!`);
    setTab("applications");
    setSelectedScheme(null);
  };

  const handleApplyClick = (scheme) => {
    if (!profile) { notify("Please complete your profile first.", "error"); return; }
    const {eligible, reasons} = checkEligibility(scheme, profile);
    if (!eligible) { notify(`Not eligible: ${reasons[0]}`, "error"); return; }
    if (applications.find(a=>a.scheme.id===scheme.id)) { notify("Already applied to this scheme.", "info"); return; }
    setApplyModal(scheme);
  };

  const handleLogout = async () => {
    try {
      const { auth } = await initFirebase();
      await auth.signOut(auth.instance);
    } catch(e) {}
    setUser(null); setProfile(null); setApplications([]);
    setScreen("login");
  };

  const handleSaveProfile = async (newProfile) => {
    setProfile(newProfile);
    setProfileEditMode(false);
    try {
      if (user?.uid) {
        const { db } = await initFirebase();
        await db.updateDoc(db.doc(db.instance, "users", user.uid), { profile: newProfile });
      }
    } catch(e) {}
    notify("Profile updated successfully!");
  };

  const filteredSchemes = SCHEMES.filter(s=>{
    const mf = filter==="All" || s.type===filter;
    const ms = s.name.toLowerCase().includes(search.toLowerCase()) || s.provider.toLowerCase().includes(search.toLowerCase());
    return mf && ms;
  });

  const handleChat = async () => {
    if (!chatInput.trim()) return;
    const uMsg = {role:"user",content:chatInput};
    const newMsgs = [...chatMessages, uMsg];
    setChatMessages(newMsgs);
    setChatInput("");
    setChatLoading(true);
    try {
      const apiMsgs = newMsgs.filter(m=>m.role==="user"||m.role==="assistant");
      const reply = await askAI(apiMsgs, profile, matched);
      setChatMessages(p=>[...p,{role:"assistant",content:reply}]);
    } catch(e) {
      setChatMessages(p=>[...p,{role:"assistant",content:"Sorry, AI chat is unavailable. Please check your API key in the app settings."}]);
    }
    setChatLoading(false);
  };

  const upcomingDeadlines = SCHEMES.filter(s=>daysLeft(s.deadline)<=30&&daysLeft(s.deadline)>0).sort((a,b)=>new Date(a.deadline)-new Date(b.deadline));

  // ── Screens ────────────────────────────────────────────────────────────────
  if (screen==="loading") return (
    <Shell>
      <div style={{minHeight:"100svh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:C.primary}}>
        <div style={{width:56,height:56,borderRadius:16,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:18,color:"white",background:`linear-gradient(135deg,${C.accent},${C.accent2})`,marginBottom:20}}>SN</div>
        <p style={{color:"rgba(255,255,255,0.4)",fontSize:14}}>Loading...</p>
      </div>
    </Shell>
  );

  if (screen==="admin") return <AdminPanel onLogout={handleLogout}/>;
  if (screen==="login") return <LoginScreen onLogin={handleLogin} onSignup={()=>setScreen("signup")} loading={false}/>;
  if (screen==="signup") return <SignupScreen onSuccess={handleSignup} onBack={()=>setScreen("login")}/>;
  if (screen==="profile-setup") return <ProfileSetupScreen user={user} onComplete={handleProfileComplete}/>;

  // ── Scheme Detail ──────────────────────────────────────────────────────────
  if (selectedScheme) {
    const {eligible, reasons} = checkEligibility(selectedScheme, profile);
    const alreadyApplied = applications.find(a=>a.scheme.id===selectedScheme.id);
    return (
      <Shell>
        <div style={{minHeight:"100svh",display:"flex",flexDirection:"column",background:C.bg}}>
          <div style={{background:selectedScheme.color,padding:"52px 20px 28px"}}>
            <button onClick={()=>setSelectedScheme(null)} style={{color:"rgba(255,255,255,0.8)",background:"none",border:"none",cursor:"pointer",fontSize:14,marginBottom:14,display:"flex",alignItems:"center",gap:6}}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12,19 5,12 12,5"/></svg> Back
            </button>
            <span style={{fontSize:11,color:"rgba(255,255,255,0.6)",textTransform:"uppercase",letterSpacing:"0.1em",fontWeight:600}}>{selectedScheme.type}</span>
            <h1 style={{fontSize:22,fontWeight:800,color:"white",marginTop:4,lineHeight:1.2}}>{selectedScheme.name}</h1>
            <p style={{fontSize:13,color:"rgba(255,255,255,0.7)",marginTop:4}}>{selectedScheme.provider}</p>
            <div style={{display:"flex",gap:10,marginTop:14}}>
              {[{l:"Benefit",v:selectedScheme.amount},{l:"Deadline",v:`${daysLeft(selectedScheme.deadline)}d left`}].map(({l,v})=>(
                <div key={l} style={{background:"rgba(255,255,255,0.2)",borderRadius:10,padding:"8px 14px",textAlign:"center"}}>
                  <div style={{color:"white",fontWeight:700,fontSize:13}}>{v}</div>
                  <div style={{color:"rgba(255,255,255,0.6)",fontSize:11}}>{l}</div>
                </div>
              ))}
              <div style={{background:eligible?"rgba(34,197,94,0.25)":"rgba(239,68,68,0.25)",borderRadius:10,padding:"8px 14px",textAlign:"center"}}>
                <div style={{color:"white",fontWeight:700,fontSize:13}}>{eligible?"Eligible":"Not Eligible"}</div>
                <div style={{color:"rgba(255,255,255,0.6)",fontSize:11}}>Your Status</div>
              </div>
            </div>
          </div>
          <div style={{flex:1,padding:"16px",display:"flex",flexDirection:"column",gap:12,overflowY:"auto",paddingBottom:24}}>
            {!eligible&&profile&&(
              <div style={{borderRadius:12,padding:14,background:"#fee2e2",border:"1px solid #fca5a5"}}>
                <p style={{fontSize:13,fontWeight:700,color:"#991b1b",marginBottom:6,display:"flex",alignItems:"center",gap:6}}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#991b1b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                  You are not eligible for this scheme
                </p>
                {reasons.map((r,i)=><p key={i} style={{fontSize:12,color:"#b91c1c",marginTop:2}}>• {r}</p>)}
              </div>
            )}
            {[
              {t:"About",c:<p>{selectedScheme.description}</p>},
              {t:"Eligibility",c:<p>{selectedScheme.eligibility}</p>},
              {t:"Required Documents",c:<ul style={{paddingLeft:0,listStyle:"none",display:"flex",flexDirection:"column",gap:6}}>
                {selectedScheme.documents.map((d,i)=>(
                  <li key={i} style={{display:"flex",alignItems:"center",gap:8}}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={C.green} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20,6 9,17 4,12"/></svg>
                    <span>{d}</span>
                  </li>
                ))}
              </ul>},
              {t:"Application Deadline",c:<p style={{fontWeight:600}}>{new Date(selectedScheme.deadline).toLocaleDateString("en-IN",{day:"numeric",month:"long",year:"numeric"})}</p>},
            ].map(({t,c})=>(
              <div key={t} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:14}}>
                <div style={{fontSize:11,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",color:C.muted,marginBottom:8}}>{t}</div>
                <div style={{fontSize:14,color:C.primary,lineHeight:1.6}}>{c}</div>
              </div>
            ))}
            <button onClick={()=>handleApplyClick(selectedScheme)} disabled={!!alreadyApplied||!eligible}
              style={{width:"100%",padding:"15px",borderRadius:14,fontWeight:700,fontSize:15,cursor:"pointer",border:"none",color:"white",
                background:alreadyApplied?"#94a3b8":eligible?`linear-gradient(135deg,${selectedScheme.color},${C.accent2})`:"#94a3b8",opacity:alreadyApplied||!eligible?0.75:1}}>
              {alreadyApplied?"Already Applied":eligible?"Apply Now":"Not Eligible"}
            </button>
          </div>
        </div>
        {applyModal&&<ApplyModal scheme={applyModal} onClose={()=>setApplyModal(null)} onSubmit={handleApplySubmit}/>}
      </Shell>
    );
  }

  // ── Main App Shell ─────────────────────────────────────────────────────────
  return (
    <Shell>
      <div style={{minHeight:"100svh",display:"flex",flexDirection:"column",background:C.bg}}>
        {notification&&(
          <div style={{position:"fixed",top:16,left:"50%",transform:"translateX(-50%)",maxWidth:360,width:"calc(100% - 32px)",zIndex:999,padding:"12px 16px",borderRadius:14,color:"white",fontSize:14,fontWeight:600,background:notification.type==="success"?C.green:notification.type==="error"?C.accent:C.yellow,boxShadow:"0 4px 20px rgba(0,0,0,0.2)"}}>
            {notification.msg}
          </div>
        )}
        <div style={{padding:"52px 16px 12px",display:"flex",alignItems:"center",justifyContent:"space-between",background:C.bg,borderBottom:`1px solid ${C.border}`,position:"sticky",top:0,zIndex:40}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:36,height:36,borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:13,color:"white",background:`linear-gradient(135deg,${C.accent},${C.accent2})`}}>SN</div>
            <div>
              <div style={{fontSize:11,color:C.muted}}>SchemeNanban</div>
              <div style={{fontSize:14,fontWeight:700,color:C.primary}}>{user?.firstName||"Student"}</div>
            </div>
          </div>
          <button onClick={()=>setShowNotif(!showNotif)} style={{position:"relative",width:38,height:38,borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",background:C.card,border:`1px solid ${C.border}`,cursor:"pointer"}}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={C.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
            {upcomingDeadlines.length>0&&<span style={{position:"absolute",top:-4,right:-4,width:18,height:18,borderRadius:9,background:C.accent,color:"white",fontSize:10,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center"}}>{upcomingDeadlines.length}</span>}
          </button>
        </div>
        {showNotif&&(
          <div onClick={()=>setShowNotif(false)} style={{position:"absolute",top:105,right:12,left:12,zIndex:100,background:C.card,border:`1px solid ${C.border}`,borderRadius:16,padding:16,boxShadow:"0 8px 30px rgba(0,0,0,0.12)"}}>
            <p style={{fontSize:13,fontWeight:700,color:C.primary,marginBottom:10,display:"flex",alignItems:"center",gap:6}}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
              Upcoming Deadlines
            </p>
            {upcomingDeadlines.length?upcomingDeadlines.map(s=>(
              <div key={s.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 0",borderBottom:`1px solid ${C.border}`}}>
                <div>
                  <p style={{fontSize:13,fontWeight:600,color:C.primary}}>{s.name}</p>
                  <p style={{fontSize:11,color:C.muted}}>{new Date(s.deadline).toLocaleDateString("en-IN")}</p>
                </div>
                <span style={{fontSize:11,fontWeight:700,padding:"3px 8px",borderRadius:6,background:daysLeft(s.deadline)<=7?"#fee2e2":"#fef3c7",color:daysLeft(s.deadline)<=7?C.accent:C.yellow}}>{daysLeft(s.deadline)}d</span>
              </div>
            )):<p style={{fontSize:13,color:C.muted}}>No deadlines in next 30 days.</p>}
          </div>
        )}
        <div style={{flex:1,overflowY:"auto",paddingBottom:96}} onClick={()=>setShowNotif(false)}>
          {tab==="home"&&<HomeTab matched={matched} applications={applications} user={user} profile={profile} onBrowse={()=>setTab("browse")} onChat={()=>setTab("chat")} onScheme={setSelectedScheme}/>}
          {tab==="browse"&&<BrowseTab schemes={filteredSchemes} filter={filter} search={search} profile={profile} onFilter={setFilter} onSearch={setSearch} onSelect={setSelectedScheme}/>}
          {tab==="chat"&&<ChatTab messages={chatMessages} input={chatInput} loading={chatLoading} onInput={setChatInput} onSend={handleChat} chatEndRef={chatEndRef}/>}
          {tab==="applications"&&<ApplicationsTab applications={applications} onSelect={setSelectedScheme}/>}
          {tab==="profile"&&<ProfileTab user={user} profile={profile} editMode={profileEditMode} onEdit={()=>setProfileEditMode(true)} onSave={handleSaveProfile} onLogout={handleLogout}/>}
        </div>
        <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:390,padding:"0 12px 16px",zIndex:40}}>
          <div style={{background:C.primary,borderRadius:18,padding:"8px 4px",display:"flex",justifyContent:"space-around"}}>
            {[
              {id:"home",svg:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></svg>,label:"Home"},
              {id:"browse",svg:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,label:"Browse"},
              {id:"chat",svg:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,label:"AI Chat"},
              {id:"applications",svg:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,label:"Applied"},
              {id:"profile",svg:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,label:"Profile"},
            ].map(t=>(
              <button key={t.id} onClick={()=>{setTab(t.id);setShowNotif(false);}} style={{display:"flex",flexDirection:"column",alignItems:"center",padding:"6px 10px",borderRadius:12,background:tab===t.id?C.accent:"transparent",border:"none",cursor:"pointer",color:tab===t.id?"white":"rgba(255,255,255,0.4)"}}>
                {t.svg}
                <span style={{fontSize:10,marginTop:2,fontWeight:600}}>{t.label}</span>
              </button>
            ))}
          </div>
        </div>
        {applyModal&&<ApplyModal scheme={applyModal} onClose={()=>setApplyModal(null)} onSubmit={handleApplySubmit}/>}
      </div>
    </Shell>
  );
}

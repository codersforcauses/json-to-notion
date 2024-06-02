import applicants1 from './normal-applicants.json' assert { type: "json" };
import applicants2 from './beginner-applicants.json' assert { type: "json" };

import projectConfig from './projectConfig.js';

import fs from 'fs';

interface ParsedApplicant {
    Timestamp: string;
    "Full Name": string;
    Pronouns: string;
    Email: string;
    "Discord Username": string;
    "GitHub Username": string;
    "UWA Student Number": string;
    "Describe your technical experience": string;
    "Are you able to attend the project sessions in person?": string;
    "What is your rough weekly availability?": string;
    "Anything else that you'd like us to know?": string;
}

interface Applicant extends ParsedApplicant {
    Preference: "beginner" | "normal" | "both";
    Reason: string;
}

interface BeginnerApplicant extends ParsedApplicant {
    "Why do you want to be part of the beginner project?": string;
}

interface WinterApplicant extends ParsedApplicant {
    "Why do you want to be part of the Winter projects?": string;
}

interface SummerApplicant extends ParsedApplicant {
    "Why do you want to be part of the Summer projects?": string;
}

const normalApplicants = projectConfig.season === "Winter" ? applicants1 as unknown as WinterApplicant[] : applicants1 as unknown as SummerApplicant[];
const beginnerApplicants = applicants2 as unknown as BeginnerApplicant[];

let merged: Array<Applicant> = [];
let inBoth = new Map<string, string>();
beginnerApplicants.forEach((applicant1) => {
    let inNormal = false;
    normalApplicants.forEach((applicant2) => {
        if (applicant1.Email === applicant2.Email) {
            inNormal = true;
            inBoth.set(applicant1.Email, applicant1["Why do you want to be part of the beginner project?"]);
        }
    })
    if (!inNormal) {
        const {"Why do you want to be part of the beginner project?": reason, ...rest} = applicant1;
        const _applicant_: Applicant = {...rest, Preference: "beginner", Reason: reason};
        merged.push(_applicant_);
    }
});
normalApplicants.forEach((applicant) => {
    if (projectConfig.season === "Winter") {
        var {"Why do you want to be part of the Winter projects?": reason, ...rest} = (applicant as WinterApplicant);
    } else {
        var {"Why do you want to be part of the Summer projects?": reason, ...rest} = (applicant as SummerApplicant);
    }
    if (inBoth.has(applicant.Email)) {
        reason = `Why they want to be in the beginner projects:\n\n ${inBoth.get(applicant.Email)}
        \n\nWhy they want to be in the ${projectConfig.season} projects:\n\n${reason}`;
        var _applicant_: Applicant = {...rest, Preference: "both", Reason: reason};
    } else {
        var _applicant_: Applicant = {...rest, Preference: "normal", Reason: reason};
    }
    merged.push(_applicant_);
})

fs.writeFile('src/applicants.json', JSON.stringify(merged, null, 2), 'utf8', () => console.log("done!"));
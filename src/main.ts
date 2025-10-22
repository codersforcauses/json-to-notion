// src/main.ts
import { Client } from "@notionhq/client";
import { z } from "zod";
import { env } from "./env.js";
import projectConfig from "./projectConfig.js";
// import applicants from "./applicants.json" assert { type: "json" };
import { createRequire } from "module";
//import pastApplicants from "./past-applicants.json" with { type: "json" };
import {
  bullet,
  bulletChildren,
  divider,
  heading_2,
  paragraph,
  todo,
  toggle,
  toggleChildren,
} from "./lib/notion/block.js";
import { BlockObjectRequest } from "@notionhq/client/build/src/api-endpoints.js";

const notion = new Client({ auth: env.NOTION_KEY });
const databaseId = env.NOTION_DATABASE_ID;
const require = createRequire(import.meta.url);
const applicants = require("../src/applicants.json");

console.log("Running Notion API script");
console.log(`Database ID: ${databaseId}`);
// console.log("Project config:", projectConfig);

// Zod Schema & Transform
const Applicant = z
  .object({
    Timestamp: z.string().optional().default("N/A"),
    "Full Name": z.string().optional().default("N/A"),
    "Preferred name (if applicable)": z.string().optional().default("N/A"),
    Pronouns: z.string().optional().default("N/A"),
    Email: z.string().optional().default("N/A"),
    "UWA Student Number": z.string().optional().default("N/A"),
    "Which projects are the best match for your current skill level?": z
      .string()
      .optional()
      .default("N/A"),
    "Discord Username (if you have one)": z.string().optional(),
    "Link to GitHub (if you have one)": z.string().optional(),
    "LinkedIn profile (if you have one)": z.string().optional(),
    "What is your major/what degree are you studying?": z
      .string()
      .optional()
      .default("N/A"),
    "Are you an undergraduate or postgraduate student?": z
      .string()
      .optional()
      .default("N/A"),
    "What year of your degree are you currently in?": z
      .string()
      .optional()
      .default("N/A"),
    "Please briefly describe your technical experience, in words": z
      .string()
      .optional()
      .default("N/A"),
    "Why do you want to be part of the Winter projects?": z
      .string()
      .optional()
      .default("N/A"),
    "in person?": z.string().optional().default("N/A"),
    availability: z.string().optional().default("N/A"),
    "Anything else that you'd like us to know?": z
      .string()
      .optional()
      .default("N/A"),
    "(Intermediate)Interest in moving onto the Client Projects": z
      .string()
      .optional()
      .default("N/A"),
  })
  .transform((applicant) => ({
    timestamp: applicant.Timestamp,
    name: applicant["Full Name"],
    preferredName: applicant["Preferred name (if applicable)"],
    pronouns: applicant.Pronouns,
    email: applicant.Email,
    studentNumber: applicant["UWA Student Number"],
    projectMatch:
      applicant[
        "Which projects are the best match for your current skill level?"
      ],
    discord: applicant["Discord Username (if you have one)"] ?? "",
    github: applicant["Link to GitHub (if you have one)"] ?? "",
    linkedin: applicant["LinkedIn profile (if you have one)"] ?? "",
    major: applicant["What is your major/what degree are you studying?"],
    degreeLevel: applicant["Are you an undergraduate or postgraduate student?"],
    yearOfStudy: applicant["What year of your degree are you currently in?"],
    techExp:
      applicant["Please briefly describe your technical experience, in words"],
    reason: applicant["Why do you want to be part of the Winter projects?"],
    preference:
      applicant[
        "Which projects are the best match for your current skill level?"
      ],
    canAttend: applicant["in person?"],
    weekly: applicant["availability"],
    anythingElse: applicant["Anything else that you'd like us to know?"],
    intermediateEoi:
      applicant["(Intermediate)Interest in moving onto the Client Projects"],
  }));

const Applicants = z.array(Applicant);

type TApplicants = z.infer<typeof Applicants>;
//type TApplicant = z.infer<typeof Applicant>;

//*========================================================================
// Helper Functions
//*========================================================================

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// const getColourFromHours = (hours: string) => {
//   switch (hours) {
//     case "1-3 Hours":
//       return "red";
//     case "3-5 Hours":
//       return "orange";
//     case "5-7 Hours":
//       return "yellow";
//     case "7-10 Hours":
//       return "green";
//     case "10-15 Hours":
//       return "blue";
//     case "15+ Hours":
//       return "purple";
//     default:
//       return "gray";
//   }
// };

// const getGender = (pronouns: string): { name: string; color: "purple" | "orange" | "green"; } => {
//   const lower = pronouns.toLowerCase();
//   if (lower === "she/her") return { name: "Female", color: "purple" };
//   if (lower === "he/him") return { name: "Male", color: "orange" };
//   return { name: "Other", color: "green" };
// };

// const getColourFromPreference = (preference: string) => {
//   const normalizedPref = preference.toLowerCase();
//   if (normalizedPref.includes("beginner")) return "yellow";
//   if (normalizedPref.includes("client")) return "brown";
//   if (normalizedPref.includes("both")) return "red";
//   return "gray";
// };

const getStatus = (
  hours: string,
): { name: string; color: "gray" | "orange" } => {
  if (["1-3 Hours", "3-5 Hours"].includes(hours)) {
    return { name: "Rejected (no interview given)", color: "gray" };
  }
  return { name: "To Send Email", color: "orange" };
};

// Helper function for chunking blocks
const chunkBlocks = (blocks: BlockObjectRequest[], size: number) => {
  const chunks = [];
  for (let i = 0; i < blocks.length; i += size) {
    chunks.push(blocks.slice(i, i + size));
  }
  return chunks;
};

// Helper function to append blocks with retry
async function appendBlocksWithRetry(
  pageId: string,
  blocks: BlockObjectRequest[],
  maxRetries = 3,
) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await notion.blocks.children.append({
        block_id: pageId,
        children: blocks,
      });
      return;
    } catch (error: any) {
      if (error.code === "conflict_error" && attempt < maxRetries) {
        await sleep(1000 * attempt); // Exponential backoff
        continue;
      }
      throw error;
    }
  }
}

//*========================================================================
// Project Blocks Generation
//*========================================================================

const projectBlocks: BlockObjectRequest[] = [];

projectConfig.projects.forEach((project) => {
  const problem: BlockObjectRequest = {
    object: "block",
    bulleted_list_item: {
      rich_text: [
        {
          text: { content: "Problem it solves: " },
          annotations: { bold: true },
        },
        {
          text: { content: project.problem },
        },
      ],
    },
  };

  const overview: BlockObjectRequest = {
    object: "block",
    bulleted_list_item: {
      rich_text: [
        {
          text: { content: "Project overview: " },
          annotations: { bold: true },
        },
        {
          text: { content: project.overview },
        },
      ],
    },
  };

  const techStack: BlockObjectRequest = bullet(
    "Tech stack: ",
    { bold: true },
    bulletChildren(project.techStack),
  );

  projectBlocks.push(paragraph(project.name, { bold: true }));
  projectBlocks.push(paragraph(project.description));
  projectBlocks.push(problem);
  projectBlocks.push(overview);
  projectBlocks.push(techStack);
  projectBlocks.push(paragraph(""));
});

projectBlocks.push(heading_2("Introduce the beginner projects"));
projectConfig.beginnerProjectInfo.forEach((info) =>
  projectBlocks.push(bullet(info)),
);

const createRemainingBlocks = (): BlockObjectRequest[] => {
  return [
    {
      object: "block",
      type: "paragraph",
      paragraph: {
        rich_text: [
          {
            type: "text",
            text: { content: "Your content here" },
          },
        ],
      },
    },
    paragraph(
      "2. (if not asked before) Why did decide to start programming and what keeps you motivated?",
    ),
    paragraph(
      "3. What else will you be doing with your time over the break? Do you have any hobbies/job/travel plans? (this is important to gauge personality but also project commitment)",
    ),
    paragraph(
      "4. Let's pretend that you are faced with a new technology or language, how do you go about learning something new? ",
    ),
    paragraph(""),
    heading_2("Bonus Question "),
    paragraph(
      "Optional (pick one) - only need to ask if you feel you don’t know the person well enough yet. Can also be used to gauge critical thinking depending on question (e.g. how would you eat a door needs a creative answer)",
      { italic: true },
    ),
    bullet(
      "If you could have dinner with any fictional character, who would it be and why?",
    ),
    bullet("If you were a superhero, what would your superpower be?"),
    bullet("How would you eat a door?"),
    bullet(
      "You can only eat one type of cuisine for the rest of your life. What would you pick?",
    ),
    bullet(
      "Imagine you’re organizing a music festival – which three artists or bands are headlining?",
    ),
    bullet(
      "If you were to describe yourself as an animal, what would it be and why?",
    ),

    divider(),
    heading_2("Introduce the projects"),
    paragraph("Bloom Room Booking System", { bold: true }),
    paragraph(
      "Problem: Bloom, an NFP that runs workshops and facilitates coworking spaces for young entrepreneurs don’t have a room booking site that fits their purposes. They currently use a system made by spacecubed that has features they don’t need and requires a separate account/login.",
    ),
    paragraph(
      "Overview:  We will be creating a room booking system for the Bloom coworking space in St Catherine’s college. The system will need to allow users to enter their name and email to book a room. They will be able to reschedule their booking via an email link they will be sent after the booking is made. We are aiming to integrate the system with google calendar and possibly notion. This project may be more backend heavy and will include working with email services and google calendar integration.",
    ),
    bullet(
      "Tech stack:",
      { bold: true },
      bulletChildren(["React", "Next.js", "Django"]),
    ),
    paragraph(""),

    paragraph("UWA Game Development Club Website", { bold: true }),
    paragraph(
      "Problem: The UWA Game Dev club is a new club that doesn’t have a website yet! They need a way for people to find out about the club, and want to showcase their members creations.",
    ),
    paragraph(
      "Overview: We will be creating a website to provide information about the club, let members know about their upcoming events, and showcase the games and art that members create in the game jam events that the club runs. We hope to integrate with itch.io so that visitors can play the games via our site, and allow playback of video/audio for the art showcase. Main project focuses will be making a cool and creative frontend and itch.io, video and audio integration.",
    ),
    bullet(
      "Tech stack:",
      { bold: true },
      bulletChildren(["React", "Next.js", "Django", "Itch.io API"]),
    ),

    heading_2("Introduce the beginner project"),
    bullet(
      "A guided project where volunteers create a personal portfolio website to showcase their skills. This project is ideal for beginners who want to learn web development basics and gain practical experience.",
    ),
    heading_2("Introduce the intermediate project"),
    bullet(
      "A guided project where volunteers learn about the frameworks used in the client projects, i.e. next.js (with react) and Django. This project is ideal for those who have completed Agile Web dev and want to gain experience with industry standard technologies.",
    ),
    paragraph(""),
    paragraph(
      "Ask the applicants preference for project (if applying for client projects) and whether they would prefer to work on the frontend or backend.",
      { italic: true },
    ),
    paragraph("PROJECT PREFERENCE!!!", { bold: true, underline: true }),
    todo("Beginner Project", { bold: true }),
    todo("Client Project", { bold: true }),
    todo("Frontend", { bold: true }),
    todo("Backend", { bold: true }),

    divider(),

    heading_2("Make sure candidate knows:"),
    bullet(
      "We use our workshops as a way to check-in on individual and team progress and use it as an opportunity to teach necessary skills. Outside of workshops, we expect volunteers to put effort into learning the given technologies in their own time, and we will offer help when needed.",
    ),
    bullet(
      "This is a real project for a real organisation, we have to avoid hand-holding, they will have to be driven and put in the time to learn! ",
    ),
    bullet(
      "There will be a lot of challenges! But we are here to help and you will learn heaps from tackling them. ",
    ),
    bullet(
      "Benefits of being on a project! → so all the challenges are worth it :) ",
      { bold: false },
      bulletChildren([
        "Experience on real world projects",
        "Form great connections with like-minded students and industry",
        "Our past volunteers have benefited from the experience they gained as successful software engineers",
        "Help charities!!",
      ]),
    ),

    divider(),

    heading_2("Other Notes"),
    paragraph("Ask if they have any questions"),
    bullet(""),

    divider(),

    heading_2("Wrap Up"),
    bullet("0-15 people per project"),
    bullet(
      "Are they in our Discord? Are they following our socials (fb, ig)? We will be posting updates there",
    ),
    bullet("Expect our email, we will get back to you within 2 weeks"),
    bullet(
      "Encourage people to start with to-do app to brush up basic skills. *to do apps are not a compulsory thing, but trying out a project using the relevant stack is very helpful!",
    ),

    divider(),

    heading_2("✨ Candidate summary"),
    paragraph("Comments on behaviour?", { bold: true }),
    bullet(""),
    paragraph("What stands out about them?", { bold: true }),
    bullet(""),
    paragraph(
      "Where do you think they will be most effective? (Which project, frontend/backend, etc.)",
      { bold: true },
    ),
    bullet(""),
    paragraph(""),

    paragraph("Individual ratings (⭐/5):\n", { bold: true }),
    paragraph("Final thoughts: \n", { bold: true }),
    heading_2("Client / Intermediate Projects Rubric"),
    toggle(
      "Technical (~40%) ⭐️⭐️⭐️⭐️⭐️",
      toggleChildren([
        "Client tech: Typescript, React, Django, Next.js, node.js",
        "Intermediate tech: HTML, CSS, JS - be more harsh, require all of HTML/CSS/JS for top marks",
        "⭐️⭐️⭐️⭐️⭐️",
        "In depth knowledge of 2+ relevant frameworks/languages, ideally also has basic knowledge of a few others",
        "Correct, detailed answers to multiple technical questions",
        "Multiple complex personal projects that they can describe in detail, or projects in their career if they have been working in industry for a long time",
        "Must be a really outstanding candidate technically - award sparingly",
        "⭐️⭐️⭐️⭐️",
        "EITHER in depth knowledge of one relevant framework/language, or basic knowledge of two or more relevant frameworks/languages",
        "Correct, detailed answer to at least one technical question",
        "Evidence of a complex personal project, or a couple of less complex personal projects. Projects show no evidence of GPT/LLM generation",
        "⭐️⭐️⭐️",
        "Basic knowledge of at least one relevant framework/language",
        "Answers to technical questions may not be fully correct but are on the right track",
        "Evidence of personal project/own learning but it is basic/possibly done with GPT/LLMs",
        "⭐️⭐️",
        "Good HTML/CSS/JS but no knowledge of client project specific frameworks. May know different, irrelevant frameworks",
        "Answers to technical questions are mostly wrong/lacking",
        "No personal projects/own learning",
        "⭐️",
        "No framework experience, poor HTML/CSS/JS",
        "Totally wrong answers to technical questions/doesn’t try",
        "No personal projects",
      ]),
    ),
    toggle(
      "Commitment (check github) (~30%) ⭐️⭐️⭐️⭐️⭐️",
      toggleChildren([
        "⭐️⭐️⭐️⭐️⭐️",
        "Would turn up to every single project session they physically could, definitely wouldn’t flake",
        "Has consistently gone above and beyond for a club/committee/project team, could also be a CFC regular who has shown significant commitment to the club already",
        "Strong, consistent github commit history - evidence they have carried group project(s) is ideal. Alternatively, evidence that they consistently work on their own projects + self teach is sufficient if they are early in their degree",
        "⭐️⭐️⭐️⭐️",
        "Would turn up to every session they could and be highly unlikely to flake",
        "Has shown previous commitment to a club/committee/team (e.g. hackathon team)",
        "Github commit history is consistent and shows candidate contributed really well to all of their group projects",
        "⭐️⭐️⭐️",
        "Unlikely that this candidate would flake but not sure",
        "No/little evidence of previous commitment to clubs/committees/teams",
        "Github commit history shows candidate pulled their weight in all group projects",
        "⭐️⭐️",
        "There is a decent chance that this candidate would flake by the end of the projects",
        "No evidence of previous commitments",
        "Github commit history shows some contributions to group projects but not enough to show they were a present/engaged group member",
        "⭐️",
        "This candidate would probably flake after the first session/wouldn’t make it far",
        "No evidence of previous commitments",
        "Basically zero github commit history",
      ]),
    ),
    toggle(
      "Availability (~15%) ⭐️⭐️⭐️⭐️⭐️",
      toggleChildren([
        "⭐️⭐️⭐️⭐️⭐️",
        "No missed sessions",
        "Great availability outside of project sessions",
        "No/minimal other commitments",
        "⭐️⭐️⭐️⭐️",
        "Maximum of one missed session",
        "Good availability outside of project sessions",
        "Minimal other commitments",
        "⭐️⭐️⭐️",
        "Two/three missed sessions",
        "Decent availability out of project sessions",
        "Some other commitments. If they are time consuming, candidate has effective management strategies",
        "⭐️⭐️",
        "4+ project sessions missed",
        "Very low availability outside of project sessions",
        "Other very time consuming commitments e.g. full time work, without proper management strategies or motivation to commit to projects",
        "⭐️",
        "Can’t attend project sessions in person",
      ]),
    ),
    toggle(
      "Teamwork and communication (~15%) ⭐️⭐️⭐️⭐️⭐️",
      toggleChildren([
        "⭐️⭐️⭐️⭐️⭐️",
        "Candidate communicated all ideas flawlessly and succinctly",
        "Candidate is genuine, personable, and friendly. They would be an amazing personality to work with",
        "Candidate could lead, motivate, and lift up team members. Other members would be more productive, comfortable and engaged if they were on a team with this candidate",
        "Candidate gives strong, detailed examples of past teamwork and conflict resolution, including evidence of leadership, defined roles, delegating tasks and critical thinking",
        "⭐️⭐️⭐️⭐️",
        "Candidate communicated their ideas well",
        "Their personality would likely fit well within a team",
        "They would make a solid effort to collaborate, support other team members, and engage with the team",
        "Gives detailed, well thought out examples of past teamwork and conflict resolution",
        "⭐️⭐️⭐️",
        "Candidate had some issues communicating but it was still possible to have a good conversation. e.g. limited english, excessive yap, inability to explain themselves",
        "Not sure if their personality would be good in a team. Candidate might be too stubborn, lack interest in teamwork, might not want to engage with others etc..",
        "Examples of past teamwork and conflict resolution are fine but nothing special",
        "⭐️⭐️",
        "Significant issues communicating, candidate is very hard to understand. English may be very poor such that candidate could not understand PM or work with project members that only speak english",
        "Would likely not work well in a team. Probably wouldn’t engage, would cause conflict, or some other reason (please make note)",
        "Examples of past teamwork/conflict resolution are bad/lacking",
        "⭐️",
        "Could not understand candidate at all",
        "Red flag behaviour",
      ]),
    ),
    toggle(
      "Motivation (not weighted, still important) ⭐️⭐️⭐️⭐️⭐️",
      toggleChildren([
        "⭐️⭐️⭐️⭐️⭐️",
        "Exceptionally driven and passionate candidate",
        "⭐️⭐️⭐️⭐️",
        "Cares about making a difference for charities and NFPs",
        "Studies CS for more than money, genuinely loves learning and developing things",
        "⭐️⭐️⭐️",
        "Mostly unremarkable - wants to meet people, gain experience with new tech etc…",
        "Doesn’t mention NFPs/charities",
        "Doesn’t seem super passionate about CS",
        "⭐️⭐️",
        "Wants to do projects for experience to get a job",
        "Not passionate about CS",
        "⭐️",
        "Purely job or money based motivation",
      ]),
    ),

    heading_2("Beginner Projects Rubric"),
    toggle(
      "Technical (~10%) ⭐️⭐️⭐️⭐️⭐️",
      toggleChildren([
        "⭐️⭐️⭐️⭐️⭐️",
        "Engaged really well with beginner technical questions and could have a really good discussion with interviewer",
        "Inventive personal projects with languages they already know or evidence of own learning",
        "⭐️⭐️⭐️⭐️",
        "Good discussion around beginner technical questions",
        "Some evidence of own learning/projects, has played around with languages they are familiar with outside of uni",
        "⭐️⭐️⭐️",
        "Some discussion around beginner technical questions, tried their best to engage despite lack of knowledge (this includes being honest that they didn’t know what you were asking about)",
        "Small amount of own learning/playing around, or has specific things they want to learn",
        "⭐️⭐️",
        "Very poor attempts at beginner technical questions",
        "No attempts to explore things on their own",
        "⭐️",
        "Totally avoided/Didn’t try to answer technical questions",
      ]),
    ),
    toggle(
      "Commitment (~15%) ⭐️⭐️⭐️⭐️⭐️",
      toggleChildren([
        "⭐️⭐️⭐️⭐️⭐️",
        "Would turn up to every single project session they physically could, definitely wouldn’t flake",
        "Has consistently gone above and beyond for a club/committee/project team, could also be a CFC regular who has shown significant commitment to the club already",
        "⭐️⭐️⭐️⭐️",
        "Would turn up to every session they could and be highly unlikely to flake",
        "Has shown previous commitment to a club/committee/team (e.g. hackathon team)",
        "⭐️⭐️⭐️",
        "Unlikely that this candidate would flake but not sure",
        "No/little evidence of previous commitment to clubs/committees/teams",
        "⭐️⭐️",
        "There is a decent chance that this candidate would flake by the end of the projects",
        "No evidence of previous commitments",
        "⭐️",
        "This candidate would probably flake after the first session/wouldn’t make it far",
        "No evidence of previous commitments",
      ]),
    ),
    toggle(
      "Availability (~15%) ⭐️⭐️⭐️⭐️⭐️",
      toggleChildren([
        "⭐️⭐️⭐️⭐️⭐️",
        "No missed sessions",
        "Great availability outside of project sessions",
        "No/minimal other commitments",
        "⭐️⭐️⭐️⭐️",
        "Maximum of one missed session",
        "Good availability outside of project sessions",
        "Minimal other commitments",
        "⭐️⭐️⭐️",
        "Two/three missed sessions",
        "Decent availability out of project sessions",
        "Some other commitments. If they are time consuming, candidate has effective management strategies",
        "⭐️⭐️",
        "4+ project sessions missed",
        "Very low availability outside of project sessions",
        "Other very time consuming commitments e.g. full time work, without proper management strategies or motivation to commit to projects",
        "⭐️",
        "Can’t attend project sessions in person",
      ]),
    ),
    toggle(
      "Teamwork and communication (~30%) ⭐️⭐️⭐️⭐️⭐️",
      toggleChildren([
        "⭐️⭐️⭐️⭐️⭐️",
        "Candidate communicated all ideas flawlessly and succinctly",
        "Candidate is genuine, personable, and friendly. They would be an amazing personality to work with",
        "Candidate could lead, motivate, and lift up team members. Other members would be more productive, comfortable and engaged if they were on a team with this candidate",
        "Candidate gives strong, detailed examples of past teamwork and conflict resolution, including evidence of leadership, defined roles, delegating tasks and critical thinking",
        "⭐️⭐️⭐️⭐️",
        "Candidate communicated their ideas well",
        "Their personality would likely fit well within a team",
        "They would make a solid effort to collaborate, support other team members, and engage with the team",
        "Gives detailed, well thought out examples of past teamwork and conflict resolution",
        "⭐️⭐️⭐️",
        "Candidate had some issues communicating but it was still possible to have a good conversation. e.g. limited english, excessive yap, inability to explain themselves",
        "Not sure if their personality would be good in a team. Candidate might be too stubborn, lack interest in teamwork, might not want to engage with others etc..",
        "Examples of past teamwork and conflict resolution are fine but nothing special",
        "⭐️⭐️",
        "Significant issues communicating, candidate is very hard to understand. English may be very poor such that candidate could not understand PM or work with project members that only speak english",
        "Would likely not work well in a team. Probably wouldn’t engage, would cause conflict, or some other reason (please make note)",
        "Examples of past teamwork/conflict resolution are bad/lacking",
        "⭐️",
        "Could not understand candidate at all",
        "Red flag behaviour",
      ]),
    ),
    toggle(
      "Motivation (~30%) ⭐️⭐️⭐️⭐️⭐️",
      toggleChildren([
        "⭐️⭐️⭐️⭐️⭐️",
        "Exceptionally driven and passionate candidate",
        "⭐️⭐️⭐️⭐️",
        "Cares about making a difference for charities and NFPs",
        "Studies CS for more than money, genuinely loves learning and developing things",
        "⭐️⭐️⭐️",
        "Mostly unremarkable - wants to meet people, gain experience with new tech etc…",
        "Doesn’t mention NFPs/charities",
        "Doesn’t seem super passionate about CS",
        "⭐️⭐️",
        "Wants to do projects for experience to get a job",
        "Not passionate about CS",
        "⭐️",
        "Purely job or money based motivation",
      ]),
    ),
  ];
};

const createPages2 = async (pagesToCreate: TApplicants) => {
  console.log("Creating pages");
  const BATCH_SIZE = 10; // Reduced batch size
  const BLOCK_CHUNK_SIZE = 100; // Notion API limit is 100 blocks per request

  for (let i = 0; i < pagesToCreate.length; i += BATCH_SIZE) {
    const batch = pagesToCreate.slice(i, i + BATCH_SIZE);

    // Create initial pages with first set of content
    const responses = await Promise.all(
      batch.map(async (applicant) => {
        await sleep(5000);
        return notion.pages.create({
          parent: { database_id: databaseId },
          properties: {
            // ... your properties ...
            Name: { title: [{ text: { content: applicant.name } }] },
            "Preferred Name": {
              rich_text: [{ text: { content: applicant.preferredName } }],
            },
            Email: { email: applicant.email },
            Pronouns: {
              rich_text: [{ text: { content: applicant.pronouns } }],
            },
            Status: { select: { name: getStatus(applicant.weekly).name } },
            Preference: { select: { name: applicant.preference } },
            Discord: { rich_text: [{ text: { content: applicant.discord } }] },
            Github: { rich_text: [{ text: { content: applicant.github } }] },
            Linkedin: {
              rich_text: [{ text: { content: applicant.linkedin } }],
            },
            Availability: { select: { name: applicant.weekly } },
            "Student Number": {
              rich_text: [{ text: { content: applicant.studentNumber } }],
            },
            "Study Level": {
              rich_text: [{ text: { content: applicant.degreeLevel } }],
            },
            "Year of Study": {
              rich_text: [{ text: { content: applicant.yearOfStudy } }],
            },
            "Intermediate EOI": {
              rich_text: [{ text: { content: applicant.intermediateEoi } }],
            },
          },
          children: [
            // First 100 blocks
            paragraph(
              "Please ensure you make the candidate feel welcome and comfortable - interviews can be daunting!\nOur goal is to not only understand a candidate's technical abilities, but also to gain a sense about their motivations, work ethic, ability to work as part of a team, and the chance that they will flake on us.",
            ),
            heading_2("Before the interview"),
            paragraph(
              "If the candidate is applying for intermediate or client projects, check their GitHub repos and contributions. Look for evidence of personal projects, learning, and commitment to projects. \n",
              { italic: true },
            ),
            paragraph("Commit history/contributions: \n", { bold: true }),
            paragraph(`Applicant GitHub: ${applicant.github}`, { bold: true }),
            paragraph("Public repos/personal projects:\n", { bold: true }),
            divider(),

            heading_2("During the interview:\n"),
            heading_2("Committee Introduction"),
            paragraph(
              "Committee members should introduce themselves and their role in CFC.\n",
            ),

            divider(),

            heading_2("Candidate Introduction"),
            paragraph(
              `The applicant is doing ${applicant.degreeLevel}, ${applicant.yearOfStudy}`,
              { bold: true },
            ),
            paragraph(
              "The candidate should give a brief introduction about themselves.\nHow did their semester go?\n Have they participated in any uni events this year?\n Are they involved with any other clubs?\nHave they been involved with CFC before (events or other projects)?\nOther club participation: \n",
            ),

            divider(),

            heading_2("Application form"),
            paragraph("Describe your technical experience", {
              underline: true,
            }),
            paragraph(`${applicant.techExp.slice(0, 1999)}`),
            paragraph(`${applicant.techExp.slice(1999)}`),
            paragraph(
              `Why do you want to be part of the ${applicant.preference}?`,
              { underline: true },
            ),
            paragraph(`${applicant.reason.slice(0, 1999)}`),
            paragraph(`${applicant.reason.slice(1999)}`),
            paragraph("Anything else that you'd like us to know?", {
              underline: true,
            }),
            paragraph(`${applicant.anythingElse}\n`),

            divider(),

            heading_2("Experience and Technical Questions"),
            paragraph(
              "Try to identify skills in technologies beneficial to CFC projects, i.e. HTML, CSS, JS, React.js, typescript, django, next.js. Skills with other frontend and backend frameworks are also applicable.\nAsk about personal projects and the technologies the candidate used to develop these. Ask about the challenges they experienced in developing these projects and how they overcame them. This shows critical thinking and depth of understanding.\n",
              { italic: true },
            ),

            heading_2("Experience questions"),
            paragraph("1. Tell me about your technical experience?"),
            paragraph(
              "2. Are you familiar with web technologies, elaborate on your experience with them.",
            ),
            paragraph(
              "3. Are you familiar with git and github, or other version control software? Describe a time you used version control to aid the development of a project.",
            ),
            paragraph(
              "4. Describe a personal project you’ve worked on. Explain your approach, including any technical challenges you faced and how you solved them. Highlight any details that showcase your skills.\n",
            ),
            {
              object: "block",
              paragraph: {
                rich_text: [
                  {
                    text: {
                      content:
                        "Optional personality/motivation check - gauge enthusiasm and general tech knowledge: ",
                    },
                    annotations: { bold: true },
                  },
                  {
                    text: {
                      content:
                        "What would your next personal project be? Given the opportunity are there any particular technologies or niches that you would like to explore?\n",
                    },
                  },
                ],
              },
            },

            divider(),

            heading_2("Technical questions"),
            paragraph(
              "Pick a question relevant to a technology that the applicant has mentioned. Make sure the applicant knows what they are talking about!\n",
              { italic: true },
            ),
            paragraph(
              "Note: If the candidate is interviewing for client projects but doesn’t know any frameworks you can ask intermediate questions, just make a note that you did this in the end section.\n",
              { italic: true },
            ),

            paragraph(
              `Applicant preference: ${applicant.preference.toLowerCase()}\n`,
              { underline: true, italic: true },
            ),
            toggle(
              "Beginner icebreaker questions (pick 1-2)",
              toggleChildren([
                "What is your favourite programming language you have learnt so far and why?",
                "What steps do you take to solve problems in your code?",
                "What is your preferred IDE/editor and why?",
                "What is your favourite operating system and why?",
              ]),
            ),
            paragraph("Intermediate (pick 2-3)\n", { bold: true }),
            paragraph("General\n", { bold: true }),
            toggle(
              "What is the DOM and how is it used?",
              toggleChildren([
                "Answer: the DOM (Document Object Model) represents the document as a tree where each node corresponds to a part of the document. It allows scripts to dynamically access and update the content, structure, and style of documents.",
              ]),
            ),
            toggle(
              "What are HTML, CSS and JS? How do they work together in web development?",
              toggleChildren([
                "Answer: HTML provides the structure, CSS styles the appearance, and JavaScript adds interactivity to web pages.",
              ]),
            ),
            toggle(
              "Name at least 3 HTTP request methods. Explain what each one does and when we would use it.",
              toggleChildren([
                "Answer:GET requests a representation of the specified resource.POST submits an entity to a resource, often causing state change or side effects on server. PUT replaces current representations of the resource with the request content. PATCH applies partial modifications to a resource. also: DELETE CONNECT OPTIONS TRACE",
              ]),
            ),
            toggle(
              "Can you explain the difference between client-side and server-side programming?",
              toggleChildren([
                "Answer: Client-side code runs in the browser (e.g., JavaScript), while server-side code runs on the server, handling requests and - sending data to the client (e.g., Python, Node.js).",
              ]),
            ),
            paragraph("CSS", { bold: true }),
            toggle(
              "What is responsive design and why is it important? How would you create a responsive page without any frameworks?",
              toggleChildren([
                "Answer: Responsive design makes websites adapt to different screen sizes and devices. It can be implemented with CSS flexbox, grid, or media queries.",
              ]),
            ),
            toggle(
              "What is the difference between padding and margin in CSS? Explain with reference to the box model.",
              toggleChildren([
                "Answer: Padding adds space inside an element, between its content and border. Margin adds space outside an element, creating gaps between elements.",
              ]),
            ),

            paragraph("JavaScript", { bold: true }),
            toggle(
              "What are JavaScript promises? How do they differ from callbacks?",
              toggleChildren([
                "Answer: Promises represent the eventual completion/failure of an asynchronous operation and its resulting value. Callbacks are functions given to another function so that it can be called later.",
              ]),
            ),
            toggle(
              "What are closures in JavaScript?",
              toggleChildren([
                "Answer: A closure is a feature in JS where an inner function has access to its own scope, the outer function's scope, and the global scope. It allows the inner function to access variables from the outer function even after the outer function has finished executing.",
              ]),
            ),
            toggle(
              "What is the difference between == and ===? When would we use each one?",
              toggleChildren([
                "Answer: == checks for value equality, allowing type conversion, while === checks for both value and type equality without conversion.",
              ]),
            ),

            paragraph("Version control", { bold: true }),
            toggle(
              "Demonstrate (or describe) how to commit and push to Github. Describe what each step is doing and why you need to do it.",
              toggleChildren([
                "Answer: interviewer can judge if it is done correctly :)",
              ]),
            ),
            toggle(
              "What is the difference between git and GitHub?",
              toggleChildren([
                "Answer: Git is a distributed version control system for tracking changes in source code during software development. GitHub is a web-based Git repository hosting service.",
              ]),
            ),
            toggle(
              "What is the difference between `git merge` and `git rebase`?",
              toggleChildren([
                "Answer: Merge: combine changes from one branch into another. Includes merge commit with two parent branches. Rebase moves/combines a sequence of commits to a new base commit. In simple words, it moves the entire feature branch to the tip of the main branch.",
              ]),
            ),
            paragraph("Client projects (pick 2-3)", { bold: true }),

            paragraph("React/next.js", { bold: true }),
            toggle(
              "What is next.js and how is it different to react?",
              toggleChildren([
                "Answer: NextJS is a framework of React that enhances its SSR, automatic code splitting, and simplified routing, while React is a frontend JS library that is used for developing interactive user interfaces and building UI components.",
              ]),
            ),
            toggle(
              "What are components in react and why are they important?",
              toggleChildren([
                "Answer: Components are reusable, independent code blocks (a function or a class) that define the structure and behavior of the UI.",
              ]),
            ),
            toggle(
              "What are hooks in react?",
              toggleChildren([
                "Answer: Hooks are special functions in react that let you use state, lifecycles, methods and other react features in functional components. Allow cleaner code and re-use of logic between components.",
              ]),
            ),
            toggle(
              "What is useEffect in React and what is the role of its dependency array?",
              toggleChildren([
                "Answer: useEffect is a hook that allows functional components to perform side effects e.g. fetching data, setting up subscriptions, or directly manipulating the DOM. It runs after the component renders, ensuring the UI is updated first. Dependency array controls when the effect runs. [] runs once after component mounts, [dep1, dep2] runs only when a dependency changes, if array is omitted, it runs after every render.",
              ]),
            ),
            toggle(
              "Can you explain what the Virtual DOM is and how React uses it?",
              toggleChildren([
                "Answer: Virtual DOM is a lightweight, in memory representation of the DOM. React updates the virtual DOM, diffs this with the virtual DOM before updates, and identifies the minimum changes needed to the real DOM. This enables faster UI updates.",
              ]),
            ),
            toggle(
              "Explain how we could implement authentication with next.js",
              toggleChildren(["Answer: OAuth, JWT etc…"]),
            ),

            paragraph("TypeScript", { bold: true }),
            toggle(
              "Differentiate between the .ts and .tsx file extensions given to a TypeScript file",
              toggleChildren([
                "Answer: .ts files contain pure ts code. .tsx files contain JSX code and are mainly used to build react components.",
              ]),
            ),
            toggle(
              "Can we specify the optional properties to TS objects? If yes, explain how.",
              toggleChildren([
                "Answer: Yes, we can specify an optional property with a ? after the property name when creating an object.",
              ]),
            ),
            toggle(
              "What are the advantages of using TypeScript over JavaScript?",
              toggleChildren([
                "Answer: Can compile down to js code that is runnable on every browser, allows us to declare strongly/statically typed variables, better intellisense and code completion, can throw errors at compile time (vs runtime for js).",
              ]),
            ),
            toggle(
              "Explain either Rest parameters or object destructuring (TS/JS but more advanced)",
              toggleChildren([
                "Answer:",
                "Rest parameters: enable functions to handle an unlimited number of arguments by grouping them into an array. Defined using ... and must be the last parameter.",
                "Object destructuring: Special syntax to extract properties from an object and assign them to variables or parameters. e.g. { name, age } = person",
              ]),
            ),

            paragraph("Django", { bold: true }),
            toggle(
              "What are Django URLs?",
              toggleChildren([
                "Answer: URLs define the routing of a web application. The urls.py file maps URL patterns to specific view functions or classes.",
              ]),
            ),
            toggle(
              "What are Django views?",
              toggleChildren([
                "Answer: A view is a function/class that takes a web request and returns a response. Acts as a connection between models and templates.",
              ]),
            ),
            toggle(
              "What are Django models?",
              toggleChildren([
                "Answer: Django models define the structure and behaviour of data. Each model typically maps to a single db table. It manages fields, relationships and constraints for storing and managing data.",
              ]),
            ),
            toggle(
              "What is the difference between `null=True` and `blank=True` in Django models?",
              toggleChildren([
                "Answer: null=True is db level - allows storing NULL in the column. blank=True is validation level - allows empty form fields.",
              ]),
            ),
            toggle(
              "What do the commands `python manage.py makemigrations` and `python manage.py migrate` do?",
              toggleChildren([
                "Answer: makemigrations creates new migration files based on the changes you have made to your models. migrate applies those migrations to the database, updating its schema.",
              ]),
            ),

            divider(),

            heading_2("Teamwork questions"),
            paragraph(
              "Try to gauge how effective the applicant will be when working in a team. It can be useful to relate these questions to earlier group projects the applicant may have mentioned.\n",
              { italic: true },
            ),

            paragraph("Questions (do not need to ask all):", { bold: true }),
            paragraph(
              "1. Describe a time when you had to work closely with others to complete a project. What was your role, and how did you contribute to the team’s success?",
            ),
            paragraph(
              "2. What challenges did you face when working in the group environment, and how did you handle them?",
              { bold: true },
            ),
            paragraph(
              "3. Describe a time when you disagreed with your colleague and how would you resolve the situation? How did you come to a compromise?\n",
            ),

            paragraph("Bonus Questions (Lauren):", { bold: true }),
            paragraph(
              "4. What is most important to you when working in a team?",
            ),
            paragraph(
              "5. Have you held a job/internship that required you to work in a larger team? What strategies did you use to work effectively in this team?",
            ),

            divider(),

            heading_2("Availability"),
            {
              object: "block",
              paragraph: {
                rich_text: [
                  {
                    text: {
                      content:
                        "Are they able to attend the project sessions in person?",
                    },
                    annotations: { underline: true },
                  },
                  {
                    text: {
                      content: `${applicant.canAttend} ( delve into this)`,
                    },
                  },
                ],
              },
            },
            paragraph(
              "Gauge whether they have other Saturday commitments (e.g. work), if they will be likely to flake, etc.\nProject sessions will be held on Saturdays 11am - 4pm",
              { italic: true },
            ),
            todo("Free on Saturdays?", { bold: true }),
            {
              object: "block",
              paragraph: {
                rich_text: [
                  {
                    text: { content: " • Weekly availability:" },
                  },
                  {
                    text: { content: `${applicant.weekly}\n` },
                    annotations: { bold: true },
                  },
                ],
              },
            },
            paragraph("Questions:", { bold: true }),
            paragraph(
              `1. What are your plans for the ${projectConfig.season} holiday? Do you have any other commitments? `,
            ),
            paragraph(
              "2. How would you manage balancing your commitments if you are accepted into our program? ",
            ),
            divider(),

            heading_2("Personality and Motivation"),
            paragraph(
              "Find out what motivated the applicant to apply for the projects and judge whether you think they will be committed. People just here for the resume will be more likely to flake.\nJudge if you think the applicant has a personality that will fit well within a team. Will they be eager to get to know and work with the other team members? Will they be engaged and continue to contribute throughout the project period?\n",
              { italic: true },
            ),
            paragraph("Questions:", { bold: true }),
            paragraph("1. Why do you want to be a part of the project?"),
            paragraph(`   ${applicant.reason}`, { bold: true }),
          ],
        });
      }),
    );

    console.log(
      `Batch ${Math.floor(i / BATCH_SIZE) + 1} initial content created`,
    );
    await sleep(2000);

    for (const response of responses) {
      try {
        const remainingBlocks: BlockObjectRequest[] =
          createRemainingBlocks(/* pass necessary data */);
        const blockChunks = chunkBlocks(remainingBlocks, BLOCK_CHUNK_SIZE);

        for (const chunk of blockChunks) {
          await appendBlocksWithRetry(response.id, chunk);
          await sleep(1000);
        }

        console.log(`Completed appending all content to page ${response.id}`);
      } catch (error) {
        console.error(`Error appending to page ${response.id}:`, error);
      }
    }

    console.log(`Batch ${Math.floor(i / BATCH_SIZE) + 1} completed`);
    await sleep(3000);
  }

  console.log("✅ All applicants processed successfully!");
};

// 🛠️ Main execution
const main = async () => {
  try {
    const pagesToCreate = Applicants.parse(applicants);
    await createPages2(pagesToCreate);
  } catch (error) {
    console.error("Error creating pages:", error);
  }
};

main();

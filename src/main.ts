// src/main.ts
import { Client } from "@notionhq/client";
import { z } from "zod";
import { env } from "./env.js";
import projectConfig from "./projectConfig.js";
import applicants from "./applicants.json" assert { type: "json" };
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

console.log("Running Notion API script");
console.log(`Database ID: ${databaseId}`);
console.log("Project config:", projectConfig);

// Zod Schema & Transform
const Applicant = z.object({
  Timestamp: z.string().optional().default("N/A"),
  "Full Name": z.string().optional().default("N/A"),
  "Preferred name (if applicable)": z.string().optional().default("N/A"),
  Pronouns: z.string().optional().default("N/A"),
  Email: z.string().optional().default("N/A"),
  "UWA Student Number": z.string().optional().default("N/A"),
  "Which projects are the best match for your current skill level?": z.string().optional().default("N/A"),
  "Discord Username (if you have one)": z.string().optional(),
  "Link to GitHub (if you have one)": z.string().optional(),
  "LinkedIn profile (if you have one)": z.string().optional(),
  "What is your major/what degree are you studying?": z.string().optional().default("N/A"),
  "Are you an undergraduate or postgraduate student?": z.string().optional().default("N/A"),
  "What year of your degree are you currently in?": z.string().optional().default("N/A"),
  "Please briefly describe your technical experience, in words": z.string().optional().default("N/A"),
  "Why do you want to be part of the Winter projects?": z.string().optional().default("N/A"),
  "Are you able to attend the project sessions in person?": z.string().optional().default("N/A"),
  "What is your rough weekly availability between June 21st and July 19th, 2025?": z.string().optional().default("N/A"),
  "Anything else that you'd like us to know?": z.string().optional().default("N/A"),
}).transform((applicant) => ({
  timestamp: applicant.Timestamp,
  name: applicant["Full Name"],
  preferredName: applicant["Preferred name (if applicable)"],
  pronouns: applicant.Pronouns,
  email: applicant.Email,
  studentNumber: applicant["UWA Student Number"],
  projectMatch: applicant["Which projects are the best match for your current skill level?"],
  discord: applicant["Discord Username (if you have one)"] ?? "",
  github: applicant["Link to GitHub (if you have one)"] ?? "",
  linkedin: applicant["LinkedIn profile (if you have one)"] ?? "",
  major: applicant["What is your major/what degree are you studying?"],
  degreeLevel: applicant["Are you an undergraduate or postgraduate student?"],
  yearOfStudy: applicant["What year of your degree are you currently in?"],
  techExp: applicant["Please briefly describe your technical experience, in words"],
  reason: applicant["Why do you want to be part of the Winter projects?"],
  preference: applicant["Which projects are the best match for your current skill level?"],
  canAttend: applicant["Are you able to attend the project sessions in person?"],
  weekly: applicant["What is your rough weekly availability between June 21st and July 19th, 2025?"],
  anythingElse: applicant["Anything else that you'd like us to know?"],
}));

const Applicants = z.array(Applicant);

type TApplicants = z.infer<typeof Applicants>;
//type TApplicant = z.infer<typeof Applicant>;

//*========================================================================
// Helper Functions
//*========================================================================

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const getColourFromHours = (hours: string) => {
  switch (hours) {
    case "1-3 Hours": return "red";
    case "3-5 Hours": return "orange";
    case "5-7 Hours": return "yellow";
    case "7-10 Hours": return "green";
    case "10-15 Hours": return "blue";
    case "15+ Hours": return "purple";
    default: return "gray";
  }
};

// const getGender = (pronouns: string): { name: string; color: "purple" | "orange" | "green"; } => {
//   const lower = pronouns.toLowerCase();
//   if (lower === "she/her") return { name: "Female", color: "purple" };
//   if (lower === "he/him") return { name: "Male", color: "orange" };
//   return { name: "Other", color: "green" };
// };

const getColourFromPreference = (preference: string) => {
  const normalizedPref = preference.toLowerCase();
  if (normalizedPref.includes("beginner")) return "yellow";
  if (normalizedPref.includes("client")) return "brown";
  if (normalizedPref.includes("both")) return "red";
  return "gray";
};

const getPreferenceDescription = (preference: string) => {
  const normalizedPref = preference.toLowerCase();
  if (normalizedPref.includes("beginner")) return "beginner project";
  if (normalizedPref.includes("client")) return `${projectConfig.season} client projects`;
  if (normalizedPref.includes("both")) return `${projectConfig.season} projects/beginner project`;
  return `${projectConfig.season} projects`;
};

const getStatus = (hours: string): { name: string; color: "gray" | "orange"; } => {
  if (["1-3 Hours", "3-5 Hours"].includes(hours)) {
    return { name: "Rejected (no interview given)", color: "gray" };
  }
  return { name: "To Send Email", color: "orange" };
};

// function getPastParticipationStatus(): {
//   name: string;
//   color: "yellow" | "orange" | "red" | "green" | "blue";
// } {
  // for (const pastApplicant of pastApplicants) {
  //   // Simple email comparison - most reliable identifier
  //   if (pastApplicant.Email && pastApplicant.Email === applicant.email) {
  //     // Check their previous status
  //     if (pastApplicant.Status === "No Interview Scheduled") {
  //       return { name: "Applied but did not schedule interview", color: "yellow" };
  //     } else if (pastApplicant.Status === "No show") {
  //       return { name: "Applied but no-showed interview", color: "red" };
  //     } else if (pastApplicant.Status === "Interview Complete") {
  //       // They completed an interview - check if they were accepted
  //       const projectParticipation = pastApplicant["Previous Project Participation"] || pastApplicant.Property || "Unknown";
        
  //       if (projectParticipation.toLowerCase().includes("rejected")) {
  //         return { name: "Applied but was rejected", color: "orange" };
  //       } else if (projectParticipation.includes("accepted") || projectParticipation.includes("Beginner") || 
  //                  ["normal", "beginner", "both"].includes(projectParticipation)) {
  //         return { name: `Applied and was accepted to ${projectParticipation}`, color: "green" };
  //       } else {
  //         return { name: `Previously interviewed (${projectParticipation})`, color: "green" };
  //       }
  //     }
  //   }
  // }
//   return { name: "Did not apply last time", color: "blue" };
// }

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
projectConfig.beginnerProjectInfo.forEach((info) => projectBlocks.push(bullet(info)));

//*========================================================================
// Main Page Creation Function
//*========================================================================

const createPages = async (pagesToCreate: TApplicants) => {
  console.log("Creating pages");
  const BATCH_SIZE = 20;

  for (let i = 0; i < pagesToCreate.length; i += BATCH_SIZE) {
    const batch = pagesToCreate.slice(i, i + BATCH_SIZE);
    
    const responses = await Promise.all(
      batch.map(async (applicant) => {
        await sleep(1500);
        return notion.pages.create({
          parent: { database_id: databaseId },
          properties: {
            Name: { title: [{ text: { content: applicant.name } }] },
            "Preferred Name": { rich_text: [{text: {content: applicant.preferredName } }] },
            Email: { email: applicant.email },
            Pronouns: { rich_text: [{ text: { content: applicant.pronouns } }] },
            Status: { select: getStatus(applicant.weekly) },
            Preference: {
              select: {
                name: applicant.preference,
                color: getColourFromPreference(applicant.preference),
              },
            },
            Discord: { rich_text: [{ text: { content: applicant.discord } }] },
            Github: { rich_text: [{ text: { content: applicant.github } }] },
            Linkedin: { rich_text: [{ text: { content: applicant.linkedin } }] },
            Availability: {
              select: {
                name: applicant.weekly,
                color: getColourFromHours(applicant.weekly),
              },
            },
            "Student Number": { rich_text: [{ text: { content: applicant.studentNumber } }] },
            "Study Level": { rich_text: [{ text: { content: applicant.degreeLevel } }] },
            "Year of Study": { rich_text: [{ text: { content: applicant.yearOfStudy } }] },
          },
          children: [
            paragraph(
              "Please ensure you make the candidate feel welcome and comfortable - interviews can be daunting!\nRemember, our goal is to not only understand a candidate's technical abilities, but also to gain a sense about their motivations, work ethic, ability to work as part of a team, and the chance that they will flake on us.",
            ),

            divider(),

            heading_2("Committee Introduction"),
            paragraph("Committee members should introduce themselves and their role in CFC.\n"),

            divider(),

            heading_2("Candidate Introduction"),
            paragraph(
              "The candidate should give a brief introduction about themselves.\nExams have just finished! How did their semester go? Have they participated in any uni events this year? Are they involved with any other clubs?",
            ),
            paragraph("Major/s: ", { bold: true }),
            paragraph("Year of Study: ", { bold: true }),
            paragraph("How did you hear about us: ", { bold: true }),
            paragraph("Have they been involved with CFC before (events or other projects)? ", { bold: true }),
            paragraph("Are they a current member?: ", { bold: true }),
            paragraph("Other club participation: ", { bold: true }),
            paragraph(""),

            divider(),

            heading_2("Application form"),
            paragraph("Describe your technical experience", { bold: true, underline: true }),
            paragraph(`${applicant.techExp.slice(0, 1999)}`),
            paragraph(`${applicant.techExp.slice(1999)}\n`),
            paragraph(
              `Why do you want to be part of the ${getPreferenceDescription(applicant.preference)}?`,
              { bold: true, underline: true },
            ),
            paragraph(`${applicant.reason.slice(0, 1999)}`),
            paragraph(`${applicant.reason.slice(1999)}\n`),
            paragraph("Anything else that you'd like us to know?", { bold: true, underline: true }),
            paragraph(`${applicant.anythingElse}\n`),

            divider(),

            heading_2("Additional questions"),
            paragraph(
              "Here is a chance to get to know more about the candidate's application. Pre-fill as much of this as possible to save time for more in-depth questions",
              { italic: true },
            ),
            {
              object: "block",
              paragraph: {
                rich_text: [
                  { text: { content: "Do they have lots of " }, annotations: { italic: true } },
                  { text: { content: "technical experience" }, annotations: { italic: true, underline: true } },
                  { text: { content: "? What kind of projects have they worked on?" }, annotations: { italic: true } },
                ],
              },
            },
            {
              object: "block",
              paragraph: {
                rich_text: [
                  { text: { content: "If they have a " }, annotations: { italic: true } },
                  { text: { content: "personal project" }, annotations: { italic: true, underline: true } },
                  {
                    text: {
                      content: ", this is a great chance to have them explain their thought process and their passion for software development!",
                    },
                    annotations: { italic: true },
                  },
                ],
              },
            },
            {
              object: "block",
              paragraph: {
                rich_text: [
                  { text: { content: "If they don't have any " }, annotations: { italic: true } },
                  { text: { content: "web development experience" }, annotations: { italic: true, underline: true } },
                  {
                    text: { content: ", what is their motivation for applying to CFC?\n" },
                    annotations: { italic: true },
                  },
                ],
              },
            },
            paragraph("Technical experience", { bold: true, underline: true }),
            paragraph("Coding Experience: ", { bold: true }),
            paragraph("What languages are you familiar with? ", { italic: true }),
            paragraph(""),
            paragraph("What are your experiences with these languages in uni? ", { italic: true }),
            paragraph(
              applicant.preference && applicant.preference.toLowerCase().includes("beginner")
                ? "NOTE: this person applied only for the beginner projects, so some of the questions below may be irrelevant."
                : "",
              { underline: true, italic: true }
            ),
            paragraph("Internships or industry experience?: ", { bold: true }),
            paragraph(""),
            paragraph("Personal / Side Projects: ", { bold: true }),
            paragraph(""),
            paragraph("Are they familiar with HTML, CSS, JavaScript?: ", { bold: true }),
            paragraph(""),
            paragraph("Are they familiar with any front end web frameworks?: ", { bold: true }),
            paragraph(""),
            paragraph("Are they familiar with any back end web frameworks?: ", { bold: true }),
            paragraph(""),
            paragraph("Do they have a preference for front end or back end?: ", { bold: true }),
            paragraph(""),
            paragraph("Do they have experience with git? ", { bold: true }),
            paragraph(""),
            {
              object: "block",
              paragraph: {
                rich_text: [
                  {
                    text: { content: "Are they able to attend the project sessions in person?" },
                    annotations: { underline: true },
                  },
                  { text: { content: " (asked in application but delve into this)" } },
                ],
              },
            },
            paragraph(
              "Gauge whether they have other Saturday commitments (e.g. work), if they will be likely to flake, etc.\nProject sessions will be held on Saturdays at UWA around 11am - 4pm",
              { italic: true },
            ),
            todo("Free on Saturdays?", { bold: true }),
            bullet("Weekly availability: \n"),
            paragraph(
              `What are your plans for the ${projectConfig.season} holiday? Do you have any other commitments? `,
              { bold: true },
            ),
            bullet(""),
            paragraph(
              "How would you manage balancing your commitments if you are accepted into our program? ",
              { bold: true },
            ),
            paragraph(""),

            divider(),

            heading_2("Teamwork"),
            paragraph(
              "A good candidate not only needs technical proficiency, but they have to be a pleasant person to work with! \n",
              { italic: true },
            ),
            paragraph("Describe your experiences working in collaborative teams. In uni or work or otherwise.", { bold: true }),
            bullet("\n"),
            paragraph(
              "Have you ever disagreed with a team member on how to solve a problem? How did you solve the disagreements?",
              { bold: true },
            ),
            paragraph(
              "( Did they try and understand the other person's perspective? How open are they to criticism and changing their views? )",
              { italic: true },
            ),
            bullet("\n"),

            divider(),

            heading_2("Vibe Check"),
            paragraph("Will this person follow through and commit to a CFC project? This is where you will find out!", { italic: true }),
            paragraph(""),
            paragraph("Why do you want to be part of the projects?:", { bold: true }),
            paragraph(
              "( They answered this in the application form, but they should be able to confidently answer in person )",
              { italic: true },
            ),
            bullet(""),
            paragraph(
              "How do you spend your free time? Do you have any hobbies? How much time do you have to work on the project?",
              { bold: true },
            ),
            bullet(""),
            paragraph("Why did you decide to start coding? ", { bold: true }),
            bullet(""),
            paragraph(
              "Let's pretend that you are faced with a new technology or language, how do you go about learning something new? ",
              { bold: true },
            ),
            paragraph("( What kind of resources do they use? What if they got stuck on a problem? )", { italic: true }),
            bullet(""),
            paragraph(
              "We have a lot of applicants and it is often a very hard decision for us in terms of who we take on for a project team.\nIf we were unable to allocate you a spot, what would you do during the holidays? ",
              { bold: true },
            ),
            paragraph(
              "( Do they have specific personal project ideas? What languages/technologies would they use? Have they done any planning? )",
              { italic: true },
            ),
            bullet(""),
            paragraph("What 3 things would you take if you got stuck on an island?", { bold: true }),
            paragraph("( + any other vibe check questions: )", { italic: true }),
            bullet("\n"),

            divider(),

            heading_2("Introduce the projects"),
          ],
        });
      })
    );
    
    console.log(`Batch ${Math.floor(i / BATCH_SIZE) + 1} completed`);
    await sleep(3000);

    // Appending more content to pages due to API limitations
    console.log("Appending additional content to pages");
    await Promise.all(
      responses.map(async (response) => {
        await sleep(1500);
        return notion.blocks.children.append({
          block_id: response.id,
          children: [
            ...projectBlocks,
            paragraph("\nPROJECT PREFERENCE or Beginner Project: ", { bold: true }),
            bullet("\n"),
            divider(),

            heading_2("Make sure candidate knows:"),
            bullet(
              "We use our workshops as a way to check-in on individual and team progress and use it as an opportunity to teach necessary skills. Outside of workshops, we expect volunteers to put effort into learning the given technologies in their own time, and we will offer help when needed.",
            ),
            bullet(
              "This is a real project for a real organisation, we have to avoid hand-holding, they will have to be driven and put in the time to learn! ",
            ),
            bullet("There will be a lot of challenges! But we are here to help and you will learn heaps from tackling them. "),
            bullet(
              "Benefits of being on a project! → so all the challenges are worth it :) ",
              { bold: false },
              bulletChildren([
                "Experience on real world projects",
                "Form great connections with like-minded students and industry",
                "Our past volunteers have benefited from the experience they gained as successful software engineers",
                "Put yourselves ahead of other students when it comes to applying for jobs and internships",
                "Mention our industry nights and that committee always gets hired ;)",
              ]),
            ),

            divider(),

            heading_2("Other Notes"),
            paragraph("Ask if they have any questions"),
            bullet(""),

            divider(),

            heading_2("Wrap Up"),
            bullet("Are they in our Discord? Are they following our socials (fb, ig)? We will be posting updates there"),
            bullet("Expect our email, we will get back to you within 2 weeks"),
            bullet("Encourage people to start with to-do app to brush up basic skills"),
            bullet("0-15 people per project"),
            bullet(
              "Let them know we will assign people (WADL: easier; POOPs: harder), but also dependent on a few other things. We try to keep the teams balanced\n",
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

            paragraph("Individual ratings (⭐/5):", { bold: true }),
            toggle(
              "Experience: ⭐⭐⭐⭐⭐",
              toggleChildren([
                "⭐ (1/5) - No programming experience",
                "⭐⭐ (2/5) - Basic understanding of programming concepts, limited web development experience",
                "⭐⭐⭐ (3/5) - Moderate programming experience, some web development knowledge (HTML, CSS, basic JS)",
                "⭐⭐⭐⭐ (4/5) - Strong programming background, good understanding of web frameworks and technologies",
                "⭐⭐⭐⭐⭐ (5/5) - Excellent technical experience, fluent in multiple frameworks, industry experience or advanced projects",
              ]),
            ),
            toggle(
              "Communication (Behavioral Interview Response): ⭐⭐⭐⭐⭐",
              toggleChildren([
                "⭐ (1/5) - Poor communication, rambling, difficult to understand responses",
                "⭐⭐ (2/5) - Basic communication, lack of clarity or depth in explanations",
                "⭐⭐⭐ (3/5) - Satisfactory responses, sometimes lacked clarity but overall adequate answers",
                "⭐⭐⭐⭐ (4/5) - Good communication skills, clear and thoughtful responses with depth",
                "⭐⭐⭐⭐⭐ (5/5) - Excellent communication, articulate and engaging responses, great storytelling",
              ]),
            ),
            toggle(
              "Teamwork (Behavioral Interview Response): ⭐⭐⭐⭐⭐",
              toggleChildren([
                "⭐ (1/5) - Poor teamwork examples, concerning responses about collaboration",
                "⭐⭐ (2/5) - Limited teamwork experience, basic understanding of collaboration",
                "⭐⭐⭐ (3/5) - Some teamwork experience, adequate responses about working with others",
                "⭐⭐⭐⭐ (4/5) - Good teamwork examples, shows understanding of collaboration and conflict resolution",
                "⭐⭐⭐⭐⭐ (5/5) - Excellent teamwork skills, strong examples of leadership and collaboration",
              ]),
            ),
            toggle(
              "Technical Answers: ⭐⭐⭐⭐⭐",
              toggleChildren([
                "⭐ (1/5) - Unable to answer technical questions, lacks basic understanding",
                "⭐⭐ (2/5) - Basic technical knowledge, struggled with more complex questions",
                "⭐⭐⭐ (3/5) - Moderate technical understanding, could answer most questions adequately",
                "⭐⭐⭐⭐ (4/5) - Strong technical knowledge, confident and accurate responses",
                "⭐⭐⭐⭐⭐ (5/5) - Exceptional technical knowledge, insightful answers, shows deep understanding",
              ]),
            ),
            toggle(
              "Personality, vibe, or overall presence: ⭐⭐⭐⭐⭐",
              toggleChildren([
                "⭐ (1/5) - Red flags, concerning personality traits or behavior",
                "⭐⭐ (2/5) - Neutral personality, some minor concerns about fit",
                "⭐⭐⭐ (3/5) - Pleasant personality, would work fine with the team",
                "⭐⭐⭐⭐ (4/5) - Great personality, enthusiastic and engaging, good team fit",
                "⭐⭐⭐⭐⭐ (5/5) - Outstanding presence, infectious enthusiasm, would be a fantastic addition to the team",
              ]),
            ),
            paragraph(""),
            paragraph("Final thoughts: ", { bold: true }),
          ],
        });
      })
    );
    
    console.log(`Batch ${Math.floor(i / BATCH_SIZE) + 1} content appended`);
    await sleep(2000);
  }
  
  console.log("✅ All applicants processed successfully!");
};

// 🛠️ Main execution
const main = async () => {
  try {
    const pagesToCreate = Applicants.parse(applicants);
    await createPages(pagesToCreate);
  } catch (error) {
    console.error("Error creating pages:", error);
  }
};

main();
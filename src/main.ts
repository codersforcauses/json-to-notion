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
              "Please ensure you make the candidate feel welcome and comfortable - interviews can be daunting!\nOur goal is to not only understand a candidate's technical abilities, but also to gain a sense about their motivations, work ethic, ability to work as part of a team, and the chance that they will flake on us."
            ),

            divider(),

            heading_2("Committee Introduction"),
            paragraph("Committee members should introduce themselves and their role in CFC.\n"),

            divider(),

            heading_2("Candidate Introduction"),
            paragraph(
              "The candidate should give a brief introduction about themselves.\nHow did their semester go? Have they participated in any uni events this year? Are they involved with any other clubs?",
            ),
            paragraph("Have they been involved with CFC before (events or other projects)? ", { bold: true }),
            paragraph("Other club participation: ", { bold: true }),

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

            heading_2("Experience and Technical Questions"),
            paragraph("Try to identify skills in technologies beneficial to CFC projects, i.e. HTML, CSS, JS, React.js, typescript, django, next.js. Skills with other frontend and backend frameworks are also applicable.", { italic: true }),
            paragraph("Ask about personal projects and the technologies the candidate used to develop these. Ask about the challenges they experienced in developing these projects and how they overcame them. This shows critical thinking and depth of understanding.", { italic: true }),

            divider(),

            heading_2("Experience questions"),
            paragraph("1. Tell me about your technical experience?",),
            paragraph("2. Are you familiar with web technologies, elaborate on your experience with them.",),
            paragraph("3. Are you familiar with git and github, or other version control software? Describe a time you used version control to aid the development of a project.",),
            paragraph("4. Describe a personal project you’ve worked on. Explain your approach, including any technical challenges you faced and how you solved them. Highlight any details that showcase your skills.\n",),
            {
              object: "block",
              paragraph: {
                rich_text: [
                  {
                    text: { content: "Optional personality/motivation check - gauge enthusiasm and general tech knowledge: " },
                    annotations: { bold: true },
                  },
                  { text: { content: "What would your next personal project be? Given the opportunity are there any particular technologies or niches that you would like to explore?" } },
                ],
              },
            },

            divider(),

            heading_2("Technical experience", { bold: true, underline: true }),
            paragraph("Pick a question relevant to a technology that the applicant has mentioned. Make sure the applicant knows what they are talking about!", { italic: true }),
            paragraph(""),

            paragraph(
              applicant.preference && applicant.preference.toLowerCase().includes("beginner")
                ? "NOTE: this person applied only for the beginner projects, so some of the questions below may be irrelevant."
                : "",
              { underline: true, italic: true }
            ),
            paragraph("Beginner (optional, ask more as a conversation starter):", { bold: true }),
            bullet("What is your preferred IDE/editor and why?"),
            bullet("What is the best operating system and why?"),
            bullet("How would you approach a new technical concept? What resources etc would you use?"),
            bullet("What are your usual steps for debugging code?"),
            paragraph(""),
            paragraph("Client projects (pick 3):", { bold: true }),
            bullet("What are HTML, CSS, and JavaScript, and how do they work together in web development?", { bold: true }),
            {
              object: "block",
              paragraph: {
                rich_text: [
                  {
                    text: { content: "Correct Answer:" },
                    annotations: { bold: true },
                  },
                  { text: { content: "HTML provides the structure, CSS styles the appearance, and JavaScript adds interactive behavior to web pages." } },
                ],
              },
            },
            bullet("Can you explain the difference between client-side and server-side programming?", { bold: true }),
            {
              object: "block",
              paragraph: {
                rich_text: [
                  {
                    text: { content: "Correct Answer:" },
                    annotations: { bold: true },
                  },
                  { text: { content: "Client-side code runs in the browser (e.g., JavaScript), while server-side code runs on the server, handling requests and - sending data to the client (e.g., Python, Node.js)." } },
                ],
              },
            },
            bullet("When developing on a computer, how would you see how a website would look on different devices? (inspector)", { bold: true }),
            {
              object: "block",
              paragraph: {
                rich_text: [
                  {
                    text: { content: "Correct Answer:" },
                    annotations: { bold: true },
                  },
                  { text: { content: "Use the browser’s Developer Tools (usually F12 or right-click > Inspect), then select 'Responsive Design' mode or use the - device toolbar to preview on various screen sizes." } },
                ],
              },
            },
            bullet("Can you describe what responsive design is and some ways to implement it?", { bold: true }),
            {
              object: "block",
              paragraph: {
                rich_text: [
                  {
                    text: { content: "Correct Answer:" },
                    annotations: { bold: true },
                  },
                  { text: { content: "Responsive design makes websites adapt to different screen sizes and devices. It can be implemented with flexible grid - layouts, media queries, and responsive images." } },
                ],
              },
            },
            bullet("What is version control, and why is it important in software development?", { bold: true }),
            {
              object: "block",
              paragraph: {
                rich_text: [
                  {
                    text: { content: "Correct Answer:" },
                    annotations: { bold: true },
                  },
                  { text: { content: "Version control tracks and manages changes to code, enabling collaboration, undoing changes, and keeping a history of code - versions, which is critical for team projects." } },
                ],
              },
            },
            bullet("What is the difference between `display: none;` and `visibility: hidden;`?", { bold: true }),
            {
              object: "block",
              paragraph: {
                rich_text: [
                  {
                    text: { content: "Correct Answer:" },
                    annotations: { bold: true },
                  },
                  { text: { content: "`display: none` removes the element from the document flow, while `visibility: hidden` hides the element but keeps its allocated - space on the page." } },
                ],
              },
            },
            bullet("How would you create a responsive layout without using any frameworks?", { bold: true }),
            {
              object: "block",
              paragraph: {
                rich_text: [
                  {
                    text: { content: "Correct Answer:" },
                    annotations: { bold: true },
                  },
                  { text: { content: "Use CSS Flexbox or Grid for layout, and media queries to adjust styles based on screen size." } },
                ],
              },
            },
            bullet("Explain the difference between == and === in JavaScript.", { bold: true }),
            {
              object: "block",
              paragraph: {
                rich_text: [
                  {
                    text: { content: "Correct Answer:" },
                    annotations: { bold: true },
                  },
                  { text: { content: "== checks for value equality, allowing type conversion, while === checks for both value and type equality without conversion." } },
                ],
              },
            },
            bullet("What are the 4 ways to declare a variable in JavaScript?", { bold: true }),
            {
              object: "block",
              paragraph: {
                rich_text: [
                  {
                    text: { content: "Correct Answer:" },
                    annotations: { bold: true },
                  },
                  { text: { content: "var, let, const, and declaring globally (without a keyword)." } },
                ],
              },
            },
            bullet("How would you change branches in Git?", { bold: true }),
            {
              object: "block",
              paragraph: {
                rich_text: [
                  {
                    text: { content: "Correct Answer:" },
                    annotations: { bold: true },
                  },
                  { text: { content: "Use the command `git checkout <branch-name>` to switch to a different branch." } },
                ],
              },
            },
            bullet("How would you create a hyperlink that opens in a new tab?", { bold: true }),
            {
              object: "block",
              paragraph: {
                rich_text: [
                  {
                    text: { content: "Correct Answer:" },
                    annotations: { bold: true },
                  },
                  { text: { content: 'Use `<a href="https://example.com" target="_blank">Link</a>` to open the link in a new tab.' } },
                ],
              },
            },
            bullet("What is the purpose of the alt attribute in an image tag?", { bold: true }),
            {
              object: "block",
              paragraph: {
                rich_text: [
                  {
                    text: { content: "Correct Answer:" },
                    annotations: { bold: true },
                  },
                  { text: { content: "The alt attribute provides alternative text for screen readers and is displayed if the image fails to load, improving - accessibility." } },
                ],
              },
            },
            bullet("How do you make text bold in CSS?", { bold: true }),
            {
              object: "block",
              paragraph: {
                rich_text: [
                  {
                    text: { content: "Correct Answer:" },
                    annotations: { bold: true },
                  },
                  { text: { content: "Use `font-weight: bold;` in CSS." } },
                ],
              },
            },
            bullet("What CSS property would you use to add space between an element's border and its content?", { bold: true }),
            {
              object: "block",
              paragraph: {
                rich_text: [
                  {
                    text: { content: "Correct Answer:" },
                    annotations: { bold: true },
                  },
                  { text: { content: "The padding property adds space between the border and the content of an element." } },
                ],
              },
            },
            bullet("How would you stage a file called index.html for commit?", { bold: true }),
            {
              object: "block",
              paragraph: {
                rich_text: [
                  {
                    text: { content: "Correct Answer:" },
                    annotations: { bold: true },
                  },
                  { text: { content: "Use the command `git add index.html` to stage the file." } },
                ],
              },
            },
            bullet("How would you center text within a `<div>` element using CSS?", { bold: true }),
            {
              object: "block",
              paragraph: {
                rich_text: [
                  {
                    text: { content: "Correct Answer:" },
                    annotations: { bold: true },
                  },
                  { text: { content: " Use `text-align: center;` on the `<div>`." } },
                ],
              },
            },
            bullet("How do you link a CSS file to an HTML file?", { bold: true }),
            {
              object: "block",
              paragraph: {
                rich_text: [
                  {
                    text: { content: "Correct Answer:" },
                    annotations: { bold: true },
                  },
                  { text: { content: 'Use the `<link>` tag inside the `<head>` section, like `<link rel="stylesheet" href="styles.css">`.' } },
                ],
              },
            },

            divider(),

            heading_2("Teamwork questions"),
            paragraph("Try to gauge how effective the applicant will be when working in a team. It can be useful to relate these questions to earlier group projects the applicant may have mentioned.", { italic: true }),
            paragraph(""),
            paragraph("Questions (do not need to ask all):", { bold: true }),
            paragraph("1. Describe a time when you had to work closely with others to complete a project. What was your role, and how did you contribute to the team’s success?"),
            paragraph("2. What challenges did you face when working in the group environment, and how did you handle them?", { bold: true }),
            paragraph("3. Describe a time when you disagreed with your colleague and how would you resolve the situation? How did you come to a compromise?"),
            paragraph(""),
            paragraph("Bonus Questions (Lauren):", { bold: true }),
            paragraph("4. What is most important to you when working in a team?"),
            paragraph("5. Have you held a job/internship that required you to work in a larger team? What strategies did you use to work effectively in this team?"),
            
            divider(),
            
            heading_2("Availability"),
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
              "Gauge whether they have other Saturday commitments (e.g. work), if they will be likely to flake, etc.\nProject sessions will be held on Saturdays 11am - 4pm",
              { italic: true },
            ),
            todo("Free on Saturdays?", { bold: true }),
            {
              object: "block",
              bullet: {
                rich_text: [
                  {
                    text: { content: "Weekly availability:" },
                  },
                  { 
                    text: { content: `${applicant.weekly}`} ,
                    annotations: { bold: true },
                  },
                ],
              },
            },
            paragraph(""),
            paragraph("Questions:", { bold: true }),
            paragraph(`1. What are your plans for the ${projectConfig.season} holiday? Do you have any other commitments? ` ),
            paragraph("2. How would you manage balancing your commitments if you are accepted into our program? " ),

            divider(),

            heading_2("Personality and Motivation"),
            paragraph(
              "Find out what motivated the applicant to apply for the projects and judge whether you think they will be committed. People just here for the resume will be more likely to flake.\n",
              { italic: true },
            ),
            paragraph(
              "Judge if you think the applicant has a personality that will fit well within a team. Will they be eager to get to know and work with the other team members? Will they be engaged and continue to contribute throughout the project period?\n",
              { italic: true },
            ),
            paragraph("Questions:", { bold: true }),
            paragraph("1. Why do you want to be a part of the project?"),
            paragraph(`   ${applicant.reason}`, { bold: true }),
            paragraph(
              "2. (if not asked before) Why did decide to start programming and what keeps you motivated?",
            ),
            paragraph(
              "3. What else will you be doing with your time over the break? Do you have any hobbies/job/travel plans? (this is important to gauge personality but also project commitment)"
            ),
            paragraph(
              "4. Let's pretend that you are faced with a new technology or language, how do you go about learning something new? "
            ),
            paragraph(""),
            heading_2("Bonus Question "),
            paragraph("Optional (pick one) - only need to ask if you feel you don’t know the person well enough yet. Can also be used to gauge critical thinking depending on question (e.g. how would you eat a door needs a creative answer)", { italic: true }),
            bullet("If you could have dinner with any fictional character, who would it be and why?"),
            bullet("If you were a superhero, what would your superpower be?"),
            bullet("How would you eat a door?"),
            bullet("You can only eat one type of cuisine for the rest of your life. What would you pick?"),
            bullet("Imagine you’re organizing a music festival – which three artists or bands are headlining?"),
            bullet("If you were to describe yourself as an animal, what would it be and why?"),

            divider(),

  

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
            heading_2("Introduce the projects"),
            paragraph("Robodrone Comp Leaderboard", { bold: true }),
            paragraph("A web-based leaderboard for Squadrone’s Drone Competition & STEM Festival, allowing admins to manage scores and rankings while showcasing participant performance to the public."),
            {
              object: "block",
              bullet: {
                rich_text: [
                  {
                    text: { content: "Problem it solves:" },
                    annotations: { bold: true },
                  },
                  { text: { content: "Manually tracking participant rankings and scores for the drone competition is inefficient and error-prone." } },
                ],
              },
            },
            {
              object: "block",
              bullet: {
                rich_text: [
                  {
                    text: { content: "Project overview: " },
                    annotations: { bold: true },
                  },
                  { text: { content: "This platform allows administrators to manage and update participant rankings for the Drone Competition. Participants and the public can view results and leaderboards online." } },
                ],
              },
            },
            bullet(
              "Tech stack:",
              { bold: true },
              bulletChildren([
                "React",
                "Next.js",
                "Django",
              ]),
            ),
            paragraph(""),

            paragraph("Transplant Australia Sport Sign-up", { bold: true }),
            paragraph("An event registration platform for the Transplant Games, collecting participant details, medical information, and event preferences."            ),
            {
              object: "block",
              bullet: {
                rich_text: [
                  {
                    text: { content: "Problem it solves:" },
                    annotations: { bold: true },
                  },
                  { text: { content: "Currently, event registrations are handled manually or via basic forms, creating difficulties in managing participant data, payments, and event logistics." } },
                ],
              },
            },
            {
              object: "block",
              bullet: {
                rich_text: [
                  {
                    text: { content: "Project overview: " },
                    annotations: { bold: true },
                  },
                  { text: { content: "This platform will enable participants to register for the Transplant Games, pay registration fees, and select events. It also collects necessary medical and emergency contact information. Admin features include event restrictions management, CSV imports for event times, and participant data editing." } },
                ],
              },
            },
            bullet(
              "Tech stack:",
              { bold: true },
              bulletChildren([
                "React",
                "Next.js",
                "Django",
                "Stripe"
              ]),
            ),
            paragraph(""),
            heading_2("Introduce the beginner projects"),
            bullet(
              "A guided project where volunteers create a personal portfolio website to showcase their skills. This project is ideal for beginners who want to learn web development basics and gain practical experience."
            ),
            paragraph(""),
            paragraph("Ask the applicants preference for project (if applying for client projects) and whether they would prefer to work on the frontend or backend.", { italic: true }),
            paragraph(
              "PROJECT PREFERENCE!!!",
              { bold: true , underline: true},
            ),
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
            bullet("There will be a lot of challenges! But we are here to help and you will learn heaps from tackling them. "),
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
            bullet("Are they in our Discord? Are they following our socials (fb, ig)? We will be posting updates there"),
            bullet("Expect our email, we will get back to you within 2 weeks"),
            bullet("Encourage people to start with to-do app to brush up basic skills. *to do apps are not a compulsory thing, but trying out a project using the relevant stack is very helpful!"),

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
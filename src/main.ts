import { Client } from "@notionhq/client";
import { z } from "zod";

import { env } from "./env.js";
import projectConfig from "./projectConfig.js";

import applicants from "./applicants.json" assert { type: "json" };
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
console.log(databaseId);
console.log(projectConfig);

const Applicant = z
  .object({
    Timestamp: z.string(),
    "Full Name": z.string(),
    Pronouns: z.string(),
    Email: z.string(),
    "Discord Username": z.string(),
    "GitHub Username": z.string(),
    "UWA Student Number": z.string(),
    "Describe your technical experience": z.string(),
    Reason: z.string(),
    "Are you able to attend the project sessions in person?": z.string(),
    "What is your rough weekly availability?": z.string(),
    "Anything else that you'd like us to know?": z.string(),
    Preference: z.string(),
  })
  .transform((applicant) => ({
    timestamp: applicant.Timestamp,
    name: applicant["Full Name"],
    pronouns: applicant.Pronouns,
    email: applicant.Email,
    discord: applicant["Discord Username"],
    github: applicant["GitHub Username"],
    studentNumber: applicant["UWA Student Number"],
    techExp: applicant["Describe your technical experience"],
    // Change season here
    reason: applicant.Reason,
    canAttend:
      applicant["Are you able to attend the project sessions in person?"],
    weekly: applicant["What is your rough weekly availability?"],
    anythingElse: applicant["Anything else that you'd like us to know?"],
    preference: applicant.Preference,
  }));

const Applicants = z.array(Applicant);

type TApplicants = z.infer<typeof Applicants>;

const main = async () => {
  const pagesToCreate = Applicants.parse(applicants);
  await createPages(pagesToCreate);
};

//*========================================================================
// Helpers
//*========================================================================

/**
 * Returns true if our DB is empty
 * Prevents duplication during glitch refreshes
 */
// const shouldCreateNewApplicants = async () => {
//     const { results } = await notion.databases.query({
//         database_id: databaseId,
//     });
//     return results.length === 0;
// };

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const getColourFromHours = (hours: string) => {
  switch (hours) {
    case "1-3 Hours":
      return "red";
    case "3-5 Hours":
      return "orange";
    case "5-7 Hours":
      return "yellow";
    case "7-10 Hours":
      return "green";
    case "10-15 Hours":
      return "blue";
    case "15+ Hours":
      return "purple";
  }
};

const getGender = (pronouns: string): { name: string; color: "purple" | "orange" | "green"; } => {
  if (pronouns.toLowerCase() === "she/her") {
    return {name: "Female", color: "purple"};
  } else if (pronouns.toLowerCase() === "he/him") {
    return {name: "Male", color: "orange"};
  } else {
    return {name: "Other", color: "green"};
  }
};

const getColourFromPreference = (preference: string) => {
  switch (preference) {
    case "both":
      return "red";
    case "beginner":
      return "yellow";
    case "normal":
      return "brown";
  }
};

const getPreferenceDescription = (preference: string) => {
  switch (preference) {
    case "beginner":
      return "beginner project";
    case "normal":
      return `${projectConfig.season} projects`;
    case "both":
      return `${projectConfig.season} projects/beginner project`;
  }
}

const getStatus = (hours: string): { name: string; color: "gray" | "orange"; } => {
  if (hours === "1-3 Hours" || hours === "3-5 Hours") {
    // Automatically reject applicants with less than 5 hours of weekly availability
    return {name: "Rejected (no interview given)", color: "gray"}
  } else {
    return {name: "To Send Confirmation", color: "orange"}
  }
}

const projectBlocks: BlockObjectRequest[] = [];

projectConfig.projects.forEach((project) => {
  const problem: BlockObjectRequest = {
    object: "block",
    bulleted_list_item: {
      rich_text: [
        {
          text: {
            content: "Problem it solves: ",
          },
          annotations: {
            bold: true,
          },
        },
        {
          text: {
            content: project.problem,
          },
        },
      ],
    },
  };
  const overview: BlockObjectRequest = {
    object: "block",
    bulleted_list_item: {
      rich_text: [
        {
          text: {
            content: "Project overview: ",
          },
          annotations: {
            bold: true,
          },
        },
        {
          text: {
            content: project.overview,
          },
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

//*========================================================================
// Requests
//*========================================================================

const createPages = async (pagesToCreate: TApplicants) => {
  console.log("Creating pages");
  // const isEmpty = await shouldCreateNewApplicants();
  // if (!isEmpty) {
  //     return;
  // }
  // https://developers.notion.com/reference/post-page

  // const applicantsTest = pagesToCreate.slice(0, 2);

  const BATCH_SIZE = 30;

  for (let i = 0; i < pagesToCreate.length; i += BATCH_SIZE) {
    const applicantsTest = pagesToCreate.slice(i, i + BATCH_SIZE);
    const responses = await Promise.all(
      applicantsTest.map(async (applicant) => {
        await sleep(1000);
        return notion.pages.create({
          parent: { database_id: databaseId },
          properties: {
            Name: {
              title: [{ text: { content: applicant.name } }],
            },
            Email: {
              email: applicant.email,
            },
            Status: {
              select: getStatus(applicant.weekly),
            },
            Preference: {
              select: {
                name: applicant.preference,
                color: getColourFromPreference(applicant.preference),
              },
            },
            Discord: {
              rich_text: [
                {
                  text: {
                    content: applicant.discord,
                  },
                },
              ],
            },
            GitHub: {
              rich_text: [
                {
                  text: {
                    content: applicant.github,
                  },
                },
              ],
            },
            "Weekly Availability": {
              select: {
                name: applicant.weekly,
                color: getColourFromHours(applicant.weekly),
              },
            },
            "Student No.": {
              rich_text: [
                {
                  text: {
                    content: applicant.studentNumber,
                  },
                },
              ],
            },
            "Gender": {
              select: getGender(applicant.pronouns),
            }
          },
          children: [
            paragraph(
              "Please ensure you make the candidate feel welcome and comfortable - interviews can be daunting!\nRemember, our goal is to not only understand a candidate’s technical abilities, but also to gain a sense about their motivations, work ethic, ability to work as part of a team, and the chance that they will flake on us.",
            ),

            divider(),

            heading_2("Committee Introduction"),
            paragraph(
              "Committee members should introduce themselves and their role in CFC.\n",
            ),

            divider(),

            heading_2("Candidate Introduction"),
            paragraph(
              "The candidate should give a brief introduction about themselves.\nExams have just finished! How did their semester go? Have they participated in any uni events this year? Are they involved with any other clubs?",
            ),
            paragraph("Major/s: ", { bold: true }),
            paragraph("Year of Study: ", { bold: true }),
            paragraph("How did you hear about us: ", { bold: true }),
            paragraph(
              "Have they been involved with CFC before (events or other projects)? ",
              { bold: true },
            ),
            paragraph("Are they a current member?: ", { bold: true }),
            paragraph("Other club participation: ", { bold: true }),
            paragraph(""),

            divider(),

            heading_2("Application form"),
            paragraph("Describe your technical experience", {
              bold: true,
              underline: true,
            }),
            paragraph(`${applicant.techExp}\n`),
            paragraph(
              `Why do you want to be part of the ${getPreferenceDescription(applicant.preference)}?`,
              {
                bold: true,
                underline: true,
              },
            ),
            paragraph(`${applicant.reason}\n`),
            paragraph("Anything else that you’d like us to know?", {
              bold: true,
              underline: true,
            }),
            paragraph(`${applicant.anythingElse}\n`),

            divider(),

            heading_2("Additional questions"),
            paragraph(
              "Here is a chance to get to know more about the candidate’s application. Pre-fill as much of this as possible to save time for more in-depth questions",
              {
                italic: true,
              },
            ),
            {
              object: "block",
              paragraph: {
                rich_text: [
                  {
                    text: {
                      content: "Do they have lots of ",
                    },
                    annotations: {
                      italic: true,
                    },
                  },
                  {
                    text: {
                      content: "technical experience",
                    },
                    annotations: {
                      italic: true,
                      underline: true,
                    },
                  },
                  {
                    text: {
                      content: "? What kind of projects have they worked on?",
                    },
                    annotations: {
                      italic: true,
                    },
                  },
                ],
              },
            },
            {
              object: "block",
              paragraph: {
                rich_text: [
                  {
                    text: {
                      content: "If they have a ",
                    },
                    annotations: {
                      italic: true,
                    },
                  },
                  {
                    text: {
                      content: "personal project",
                    },
                    annotations: {
                      italic: true,
                      underline: true,
                    },
                  },
                  {
                    text: {
                      content:
                        ", this is a great chance to have them explain their thought process and their passion for software development!",
                    },
                    annotations: {
                      italic: true,
                    },
                  },
                ],
              },
            },
            {
              object: "block",
              paragraph: {
                rich_text: [
                  {
                    text: {
                      content: "If they don’t have any ",
                    },
                    annotations: {
                      italic: true,
                    },
                  },
                  {
                    text: {
                      content: "web development experience",
                    },
                    annotations: {
                      italic: true,
                      underline: true,
                    },
                  },
                  {
                    text: {
                      content:
                        ", what is their motivation for applying to CFC?\n",
                    },
                    annotations: {
                      italic: true,
                    },
                  },
                ],
              },
            },
            paragraph("Technical experience", { bold: true, underline: true }),
            paragraph("Coding Experience: ", { bold: true }),
            paragraph("What languages are you familiar with? ", {
              italic: true,
            }),
            paragraph(""),
            paragraph(
              "What are your experiences with these languages in uni? ",
              {
                italic: true,
              },
            ),
            paragraph(""),
            paragraph("Internships or industry experience?: ", { bold: true }),
            paragraph(""),
            paragraph("Personal / Side Projects: ", { bold: true }),
            paragraph(""),
            paragraph("Are they familiar with HTML, CSS, JavaScript?: ", {
              bold: true,
            }),
            paragraph(""),
            paragraph(
              "Are they familiar with any front end web frameworks?: ",
              {
                bold: true,
              },
            ),
            paragraph(""),
            paragraph("Are they familiar with any back end web frameworks?: ", {
              bold: true,
            }),
            paragraph(""),
            paragraph(
              "Do they have a preference for front end or back end?: ",
              {
                bold: true,
              },
            ),
            paragraph(""),
            paragraph("Do they have experience with git? ", { bold: true }),
            paragraph(""),
            {
              object: "block",
              paragraph: {
                rich_text: [
                  {
                    text: {
                      content:
                        "Are they able to attend the project sessions in person?",
                    },
                    annotations: {
                      underline: true,
                    },
                  },
                  {
                    text: {
                      content: " (asked in application but delve into this)",
                    },
                  },
                ],
              },
            },
            paragraph(
              "Gauge whether they have other Saturday commitments (e.g. work), if they will be likely to flake, etc.\nProject sessions will be held on Saturdays at UWA around 11am - 4pm",
              {
                italic: true,
              },
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
              {
                italic: true,
              },
            ),
            paragraph(
              "Describe your experiences working in collaborative teams. In uni or work or otherwise.",
              {
                bold: true,
              },
            ),
            bullet("\n"),
            paragraph(
              "Have you ever disagreed with a team member on how to solve a problem? How did you solve the disagreements?",
              {
                bold: true,
              },
            ),
            paragraph(
              "( Did they try and understand the other person’s perspective? How open are they to criticism and changing their views? )",
              { italic: true },
            ),
            bullet("\n"),

            divider(),

            heading_2("Vibe Check"),
            paragraph(
              "Will this person follow through and commit to a CFC project? This is where you will find out!",
              { italic: true },
            ),
            paragraph(""),
            paragraph("Why do you want to be part of the projects?:", {
              bold: true,
            }),
            paragraph(
              "( They answered this in the application form, but they should be able to confidently answer in person )",
              {
                italic: true,
              },
            ),
            bullet(""),
            paragraph(
              "How do you spend your free time? Do you have any hobbies? How much time do you have to work on the project?",
              {
                bold: true,
              },
            ),
            bullet(""),
            paragraph("Why did you decide to start coding? ", { bold: true }),
            bullet(""),
            paragraph(
              "Let’s pretend that you are faced with a new technology or language, how do you go about learning something new? ",
              {
                bold: true,
              },
            ),
            paragraph(
              "( What kind of resources do they use? What if they got stuck on a problem? )",
              { italic: true },
            ),
            bullet(""),
            paragraph(
              "We have a lot of applicants and it is often a very hard decision for us in terms of who we take on for a project team.\nIf we were unable to allocate you a spot, what would you do during the holidays? ",
              {
                bold: true,
              },
            ),
            paragraph(
              "( Do they have specific personal project ideas? What languages/technologies would they use? Have they done any planning? )",
              { italic: true },
            ),
            bullet(""),
            paragraph(
              "What 3 things would you take if you got stuck on an island?",
              {
                bold: true,
              },
            ),
            paragraph("( + any other vibe check questions: )", {
              italic: true,
            }),
            bullet("\n"),

            divider(),

            heading_2("Introduce the projects"),
            ...projectBlocks,
            paragraph("PROJECT PREFERENCE or Beginner Project: ", {
              bold: true,
            }),
            bullet("\n"),
          ],
        });
      }),
    );
    console.log("Created pages");

    console.log("Let Notion settle for 2 seconds");
    await sleep(2000);

    // Appending more stuff to the page due to API limitations
    console.log("Appending pages due to API limitations");
    await Promise.all(
      responses.map(async (response) => {
        await sleep(1000);
        return notion.blocks.children.append({
          block_id: response.id,
          children: [
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
            bullet(
              "Are they in our Discord? Are they following our socials (fb, ig)? We will be posting updates there",
            ),
            bullet("Expect our email, we will get back to you within 2 weeks"),
            bullet(
              "Encourage people to start with to-do app to brush up basic skills",
            ),
            bullet("0-15 people per project"),
            bullet(
              "Let them know we will assign people (WADL: easier; POOPs: harder), but also dependent on a few other things. We try to keep the teams balanced\n",
            ),

            divider(),

            heading_2("✨ Candidate summary"),
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

            paragraph("Individual ratings (/5):", { bold: true }),
            toggle(
              "Availability: ",
              toggleChildren([
                "1 - no free time",
                "2 - would miss more than 3 saturdays, seems like they have lots of commitments to focus on",
                "3 - lower time commitment indicated and/or would miss 3 saturdays",
                "4 - average - high time commitment indicated, would only miss 1 or no saturdays",
                "5 - high time commitment indicated and would be able to attend the whole time",
              ]),
            ),
            toggle(
              "Commitment: ",
              toggleChildren([
                "1 - no initiative, seems like a flaker",
                "2 - Expresses some interest, but didn’t show much initiative to learn the frameworks. Would likely flake",
                "3 - seems keen and interested to learn but doesnt have too much personal project info to back it up. unsure if they would flake or not",
                "4 - has a good amount of initiative, doesn’t seem like they will flake, keen to learn new things, has done personal projects out of uni before",
                "5 - has tons of initiative, has done an array of personal projects in depth, seems very keen to learn new things, very unlikely to flake",
              ]),
            ),
            toggle(
              "Technical experience: ",
              toggleChildren([
                "0 - no programming experience",
                "1 - no understanding of webdev concepts and/or basic knowledge of non web dev languages",
                "2 - basic understanding of webdev (can write in HTML, CSS, maybe JS) and/or moderate understanding of non web dev languages",
                "3 - succinct understanding of webdev (agile web dev, could explain their project and contributions well, good JS knowledge) and/or moderate - advanced knowledge of other non web dev languages",
                "4 - knowledgeable about webdev frameworks, knows a decent amount more than just JS in front or back end. and/or very detailed and advanced knowledge of non webdev language which shows high initiative",
                "5 - excellent at front or back end webdev frameworks. ( uses the framework at work perhaps? shows fluency in the framework)",
              ]),
            ),
            toggle(
              "Communication skills: ",
              toggleChildren([
                "1 - rambling, didnt understand interviewee",
                "2 - very basic and lack of clarity or depth in explanations",
                "3 - satisfactory responses, sometimes lacked clarity or depth but overall had suitable/sufficient answers",
                "4 - good answers which almost always had depth and clarity. Was able to articulate themselves well",
                "5 - fluent and excellent articulation of all relevant concepts and ideas. Was able to express themselves very well",
              ]),
            ),
            toggle(
              "Vibe check: ",
              toggleChildren([
                "1 - red flags galore",
                "2 - red flag alert",
                "3 - neutral/satisfactory vibes",
                "4 - likeable candidate, seems cool to work with",
                "5 - i really want to work with this person! very good vibes!",
              ]),
            ),
            paragraph(""),
            paragraph("Final thoughts: ", { bold: true }),
          ],
        });
      }),
    );
    console.log("Appended pages");
    console.log(`Total: ${i + BATCH_SIZE}\n`);
  }
  console.log("Done!");
};

main();

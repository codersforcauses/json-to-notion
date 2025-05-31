interface Project {
  name: string;
  description: string;
  problem: string;
  overview: string;
  techStack: string[];
}

interface ProjectConfig {
  season: "Winter" | "Summer";
  projects: Project[];
  beginnerProjectInfo: string[];
}

const project1: Project = {
  name: "Robodrone Comp Leaderboard",
  description: "A web-based leaderboard for Squadrone’s Drone Competition & STEM Festival, allowing admins to manage scores and rankings while showcasing participant performance to the public.",
  problem: "Manually tracking participant rankings and scores for the drone competition is inefficient and error-prone.",
  overview: "This platform allows administrators to manage and update participant rankings for the Drone Competition. Participants and the public can view results and leaderboards online.",
  techStack: ["React", "Next.js", "Django"]
};

const project2: Project = {
  name: "Transplant Australia Sport Sign-up",
  description: "An event registration platform for the Transplant Games, collecting participant details, medical information, and event preferences.",
  problem: "Currently, event registrations are handled manually or via basic forms, creating difficulties in managing participant data, payments, and event logistics.",
  overview: "This platform will enable participants to register for the Transplant Games, pay registration fees, and select events. It also collects necessary medical and emergency contact information. Admin features include event restrictions management, CSV imports for event times, and participant data editing.",
  techStack: ["React", "Next.js", "Django", "Stripe"]
};

const projectConfig: ProjectConfig = {
  season: "Winter",
  projects: [project1, project2],
  beginnerProjectInfo: [
    "A guided project where volunteers create a personal portfolio website to showcase their skills. This project is ideal for beginners who want to learn web development basics and gain practical experience."
  ]
};

export default projectConfig;

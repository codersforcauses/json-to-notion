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
  name: "Project 1",
  description: "Description 1",
  problem: "Problem 1",
  overview: "Overview 1",
  techStack: ["Tech 1", "Tech 2"],
};

const project2: Project = {
  name: "Project 2",
  description: "Description 2",
  problem: "Problem 2",
  overview: "Overview 2",
  techStack: ["Tech 1", "Tech 2"],
};

const projectConfig: ProjectConfig = {
  season: "Summer",
  projects: [project1, project2],
  beginnerProjectInfo: ["Thing that will happen 1", "Thing that will happen 2"]
};

export default projectConfig;

export interface StudentSkill {
  skillName: string;
  yearsOfExperience: number;
}

export interface StudentContact {
  email: string;
  phone: string;
  location: string;
  linkedInUrl?: string;
  githubUrl?: string;
}

export interface Student {
  id: number;
  name: string;
  headline: string;
  contact: StudentContact;
  skills: StudentSkill[];
  bio?: string;
  cvUrl?: string;
}

export interface Company {
  id: number;
  name: string;
  email: string;
  location: string;
  websiteUrl?: string;
}

export type WorkMode = 'Remote' | 'Hybrid' | 'On-site';

export interface JobRequirement {
  skillName: string;
  minYears: number;
}

export interface JobPost {
  id: number;
  companyId: number;
  companyName: string;
  title: string;
  location: string;
  workMode: WorkMode;
  description: string;
  requirements: JobRequirement[];
  postedAtIso: string;
}

import { Skill } from "../models/skill.model";

export const getAllSkills = async () => {
    const skills = await Skill.find().lean();
    return skills;
};

export const createSkill = async (skillData: { name: string; category: string }) => {
    const skill = new Skill(skillData);
    return await skill.save();
};

export const getSkillById = async (skillId: string) => {
    const skill = await Skill.findById(skillId).lean();
    if (!skill) throw new Error("Skill not found");
    return skill;
};


"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSkillById = exports.createSkill = exports.getAllSkills = void 0;
const skill_model_1 = require("../models/skill.model");
const getAllSkills = async () => {
    const skills = await skill_model_1.Skill.find().lean();
    return skills;
};
exports.getAllSkills = getAllSkills;
const createSkill = async (skillData) => {
    const skill = new skill_model_1.Skill(skillData);
    return await skill.save();
};
exports.createSkill = createSkill;
const getSkillById = async (skillId) => {
    const skill = await skill_model_1.Skill.findById(skillId).lean();
    if (!skill)
        throw new Error("Skill not found");
    return skill;
};
exports.getSkillById = getSkillById;

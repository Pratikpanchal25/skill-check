"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const express_1 = __importDefault(require("express"));
const db_1 = __importDefault(require("./database/db"));
const cors_1 = __importDefault(require("cors"));
const user_routes_1 = __importDefault(require("./routes/user.routes"));
const session_routes_1 = __importDefault(require("./routes/session.routes"));
const skill_routes_1 = __importDefault(require("./routes/skill.routes"));
const analytics_routes_1 = __importDefault(require("./routes/analytics.routes"));
dotenv_1.default.config();
(0, db_1.default)();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
app.use(express_1.default.json());
app.use((0, cors_1.default)({
    origin: "*",
}));
app.use("/api/users", user_routes_1.default);
app.use("/api/sessions", session_routes_1.default);
app.use("/api/skills", skill_routes_1.default);
app.use("/api/analytics", analytics_routes_1.default);
app.get("/", (req, res) => {
    res.send("Skillcheck API is running");
});
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

import dotenv from "dotenv";
import express from "express";
import connectDB from "./database/db";
import cors from "cors";
import userRoutes from "./routes/user.routes";
import sessionRoutes from "./routes/session.routes";
import skillRoutes from "./routes/skill.routes";
import analyticsRoutes from "./routes/analytics.routes";
import githubRoutes from "./routes/github.routes";
import { startGithubSyncJob } from "./jobs/githubSyncJob";

dotenv.config();

connectDB();

const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.json());
app.use(
  cors({
    origin: "*",
  }),
);
app.use("/api/users", userRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api/skills", skillRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/github", githubRoutes);

app.get("/", (req, res) => {
  res.send("Skillcraft API is running");
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

startGithubSyncJob();

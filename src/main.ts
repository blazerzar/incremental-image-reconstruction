import express from "express";
import path from "path";

const port = process.env.PORT || 3000;
const app = express();

app.use(express.static(path.join(process.cwd(), "dist")));
app.use("/shaders", express.static(path.join(process.cwd(), "src", "shaders")));
app.use(express.static(path.join(process.cwd(), "public")));

app.listen(port, () => {
    console.log(`Listening on port ${port}`);
});

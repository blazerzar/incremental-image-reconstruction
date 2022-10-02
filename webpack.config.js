const path = require("path");

module.exports = {
    mode: "none",
    entry: {
        imageReconstruction: "./build/client/imageReconstruction.js",
    },
    output: {
        filename: "[name].js",
        path: path.resolve(__dirname, "dist"),
    },
};
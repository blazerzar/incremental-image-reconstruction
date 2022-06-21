const path = require("path");

module.exports = {
    mode: "none",
    entry: {
        jacobi: "./build/client/jacobi.js",
    },
    output: {
        filename: "[name].js",
        path: path.resolve(__dirname, "dist"),
    },
};
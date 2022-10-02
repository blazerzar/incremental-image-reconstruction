import { Jacobi } from "./Jacobi";
import { getImage } from "./utils";

async function main() {
    // TODO: Read from website
    const image = await getImage("images/cat.jpg");
    const size = 512;
    const method = "jacobi";

    // Get canvases that are actually shown on the web page
    const reconstruction = document.getElementById(
        "reconstruction-canvas"
    ) as HTMLCanvasElement;
    const points = document.getElementById(
        "points-canvas"
    ) as HTMLCanvasElement;
    const residual = document.getElementById(
        "residual-canvas"
    ) as HTMLCanvasElement;

    reconstruction.width = size;
    reconstruction.height = size;
    points.width = size;
    points.height = size;
    residual.width = size;
    residual.height = size;

    let solver;
    if (method === "jacobi") {
        solver = new Jacobi(image, size, reconstruction, points, residual, 1.0);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    main();
});

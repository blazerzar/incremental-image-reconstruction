import { Jacobi } from "./Jacobi";
import { SuccessiveOverRelaxation } from "./SuccessiveOverRelaxation";
import { getImage } from "./utils";

async function main() {
    // TODO: Read from website
    const size = 512;
    const image = await getImage("images/cat.jpg", size);
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
        solver = new SuccessiveOverRelaxation(
            image,
            size,
            reconstruction,
            points,
            residual
        );
    }
}

document.addEventListener("DOMContentLoaded", () => {
    main();
});

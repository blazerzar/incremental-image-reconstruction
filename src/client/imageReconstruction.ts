import { Solver } from "./Solver";
import { Jacobi } from "./Jacobi";
import { SuccessiveOverRelaxation } from "./SuccessiveOverRelaxation";
import { ConjugateGradient } from "./ConjugateGradient";
import { Multigrid } from "./Multigrid";
import { getImage } from "./utils";

// Parameters
let method: string;
let gridSize: number;
let weight: number;
let omega: number;
let smoothingIterations: number;
let solveIterations: number;

let imageUri = "images/cat.jpg";

async function main() {
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

    let solver: Solver;
    const createSolver = async () => {
        for (const canvas of [reconstruction, points, residual]) {
            canvas.width = gridSize;
            canvas.height = gridSize;
        }

        const image = await getImage(imageUri, gridSize);

        if (method === "jacobi") {
            solver = new Jacobi(
                image,
                gridSize,
                reconstruction,
                points,
                residual,
                weight
            );
        } else if (method === "cg") {
            solver = new ConjugateGradient(
                image,
                gridSize,
                reconstruction,
                points,
                residual
            );
        } else if (method === "sor") {
            solver = new SuccessiveOverRelaxation(
                image,
                gridSize,
                reconstruction,
                points,
                residual,
                omega
            );
        } else if (method === "multigrid") {
            solver = new Multigrid(
                image,
                gridSize,
                reconstruction,
                points,
                residual,
                smoothingIterations,
                solveIterations
            );
        }
    };
    createSolver();

    const button = document.getElementById("clear-button");
    button.onclick = () => {
        solver.free();
        createSolver();
    };
}

document.addEventListener("DOMContentLoaded", () => {
    // HTML elements
    const methodDropdown = document.getElementById(
        "method-dropdown"
    ) as HTMLSelectElement;
    const gridSizeLabel = document.getElementById("grid-size-label");
    const gridSizeSlider = document.getElementById(
        "grid-size-slider"
    ) as HTMLInputElement;
    const weightField = document.getElementById(
        "weight-field"
    ) as HTMLInputElement;
    const omegaField = document.getElementById(
        "omega-field"
    ) as HTMLInputElement;
    const smoothField = document.getElementById(
        "smoothing-iters-field"
    ) as HTMLInputElement;
    const solveField = document.getElementById(
        "solve-iters-field"
    ) as HTMLInputElement;
    const imageLoad = document.getElementById("image-load") as HTMLInputElement;

    const setDisabled = () => {
        weightField.disabled = method !== "jacobi";
        omegaField.disabled = method !== "sor";
        smoothField.disabled = method !== "multigrid";
        solveField.disabled = method !== "multigrid";
    };

    // Default values
    method = methodDropdown.value;
    gridSize = Math.pow(2, +gridSizeSlider.value);
    gridSizeLabel.innerText = `Grid size: ${gridSize}`;
    weight = +weightField.value;
    omega = +omegaField.value;
    smoothingIterations = +smoothField.value;
    solveIterations = +solveField.value;
    setDisabled();

    // Method change
    methodDropdown.onchange = () => {
        if (methodDropdown.value !== method) {
            method = methodDropdown.value;
            setDisabled();
        }
    };

    // Grid size change
    gridSizeSlider.onchange = () => {
        gridSize = Math.pow(2, +gridSizeSlider.value);
        gridSizeLabel.innerText = `Grid size: ${gridSize}`;
    };

    // Fields change
    weightField.onchange = () => {
        weight = +weightField.value;
    };
    omegaField.onchange = () => {
        omega = +omegaField.value;
    };
    smoothField.onchange = () => {
        smoothingIterations = +smoothField.value;
    };
    solveField.onchange = () => {
        solveIterations = +solveField.value;
    };

    // Image loading
    imageLoad.onchange = () => {
        const reader = new FileReader();
        reader.onload = (event) => {
            imageUri = event.target.result as string;
        };
        reader.readAsDataURL(imageLoad.files[0]);
    };

    // Modal window setup
    const modalOpen = document.getElementById("modal-open");
    const modal = document.getElementById("modal");
    const modalContent = document.getElementById("modal-content");

    modalOpen.onclick = () => {
        modal.style.display = "flex";
    };

    modal.onclick = () => {
        modal.style.display = "none";
    };

    modalContent.onclick = (event) => {
        event.stopPropagation();
    };

    main();
});

import { Drawing, Solver } from "./Solver";

type Grid = {
    reconstructionRead: Drawing;
    reconstructionWrite: Drawing;
    points: Drawing;
    f: Drawing;
    temp: Drawing;
    size: number;
};

export class Multigrid extends Solver {
    // Multigrid parameters
    private nSmooth: number;
    private nSolve: number;

    private grids: Array<Grid>;

    constructor(
        image: ImageData,
        size: number,
        reconstructionCanvas: HTMLCanvasElement,
        pointsCanvas: HTMLCanvasElement,
        residualCanvas: HTMLCanvasElement,
        nSmooth = 50,
        nSolve = 20,
        minGridSize = 2
    ) {
        super(image, size, reconstructionCanvas, pointsCanvas, residualCanvas, [
            ["renderToCanvas.vert", "sor/updateRedBlack.frag"],
            ["renderToCanvas.vert", "multigrid/restriction.frag"],
            ["renderToCanvas.vert", "multigrid/correction.frag"],
        ]);

        this.nSmooth = nSmooth;
        this.nSolve = nSolve;

        // Initialize grids for all levels
        this.grids = [];
        for (let s = size; s >= minGridSize; s /= 2) {
            this.grids.push({
                reconstructionRead:
                    s === size
                        ? this.reconstructionRead
                        : this.createDrawing(s),
                reconstructionWrite:
                    s === size
                        ? this.reconstructionWrite
                        : this.createDrawing(s),
                points: s === size ? this.pointsDrawing : this.createDrawing(s),
                f: this.createDrawing(s),
                temp: this.createDrawing(s),
                size: s,
            });
        }
    }

    protected update(): void {
        this.vCycle(0);
    }

    private vCycle(depth: number): void {
        const {
            reconstructionRead: recReadFine,
            reconstructionWrite: recWriteFine,
            points: pointsFine,
            f: fFine,
            temp: tempFine,
            size: sFine,
        } = this.grids[depth];
        const {
            reconstructionRead: recReadCoarse,
            reconstructionWrite: recWriteCoarse,
            points: pointsCoarse,
            f: fCoarse,
            size: sCoarse,
        } = this.grids[depth + 1];

        // Pre-smoothing
        for (let i = 0; i < this.nSmooth; ++i) {
            this.smoothing(recReadFine, recWriteFine, pointsFine, fFine, sFine);
        }

        // Residual
        this.residual(tempFine, recReadFine, pointsFine, fFine, sFine);

        // Restriction
        this.restriction(tempFine, fCoarse, sCoarse, false);
        this.restriction(pointsFine, pointsCoarse, sCoarse, true);

        // Recursion or direct solver
        if (depth + 2 >= this.grids.length) {
            for (let i = 0; i < this.nSolve; ++i) {
                this.smoothing(
                    recReadCoarse,
                    recWriteCoarse,
                    pointsCoarse,
                    fCoarse,
                    sCoarse
                );
            }
        } else {
            this.vCycle(depth + 1);
        }

        // Prolongation and correction
        this.correction(recReadFine, recWriteFine, recReadCoarse, sFine);
        [
            this.grids[depth].reconstructionRead,
            this.grids[depth].reconstructionWrite,
        ] = [
            this.grids[depth].reconstructionWrite,
            this.grids[depth].reconstructionRead,
        ];

        // Post-smoothing
        for (let i = 0; i < this.nSmooth; ++i) {
            // Need to reverse local read and write variables
            this.smoothing(recWriteFine, recReadFine, pointsFine, fFine, sFine);
        }
    }

    private smoothing(
        recRead: Drawing,
        recWrite: Drawing,
        points: Drawing,
        f: Drawing,
        size: number
    ): void {
        this.updateColor(recRead, recWrite, points, f, size, 0);
        // Swap read and write buffers
        this.updateColor(recWrite, recRead, points, f, size, 1);
    }

    private restriction(
        fine: Drawing,
        coarse: Drawing,
        size: number,
        boundary: boolean
    ): void {
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, coarse.framebuffer);
        this.gl.viewport(0, 0, size, size);

        const { program, uniforms } = this.programs.get(
            "multigrid/restriction"
        );
        this.gl.useProgram(program);

        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.bindTexture(this.gl.TEXTURE_2D, fine.texture);
        this.gl.uniform1i(uniforms.get("uImage"), 0);

        this.gl.uniform1i(uniforms.get("uBoundary"), +boundary);

        this.gl.bindVertexArray(this.clipVao);
        this.gl.drawArrays(this.gl.TRIANGLE_FAN, 0, 4);
    }

    private correction(
        reconstructionRead: Drawing,
        reconstructionWrite: Drawing,
        correction: Drawing,
        size: number
    ): void {
        this.gl.bindFramebuffer(
            this.gl.FRAMEBUFFER,
            reconstructionWrite.framebuffer
        );
        this.gl.viewport(0, 0, size, size);

        const { program, uniforms } = this.programs.get("multigrid/correction");
        this.gl.useProgram(program);

        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.bindTexture(this.gl.TEXTURE_2D, reconstructionRead.texture);
        this.gl.uniform1i(uniforms.get("uReconstruction"), 0);

        this.gl.activeTexture(this.gl.TEXTURE1);
        this.gl.bindTexture(this.gl.TEXTURE_2D, correction.texture);
        this.gl.uniform1i(uniforms.get("uCorrection"), 1);

        this.gl.bindVertexArray(this.clipVao);
        this.gl.drawArrays(this.gl.TRIANGLE_FAN, 0, 4);
    }

    private updateColor(
        reconstructionRead: Drawing,
        reconstructionWrite: Drawing,
        points: Drawing,
        f: Drawing,
        size: number,
        color: 0 | 1
    ): void {
        this.gl.bindFramebuffer(
            this.gl.FRAMEBUFFER,
            reconstructionWrite.framebuffer
        );
        this.gl.viewport(0, 0, size, size);

        const { program, uniforms } = this.programs.get("sor/updateRedBlack");
        this.gl.useProgram(program);

        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.bindTexture(this.gl.TEXTURE_2D, reconstructionRead.texture);
        this.gl.uniform1i(uniforms.get("uReconstruction"), 0);

        this.gl.activeTexture(this.gl.TEXTURE1);
        this.gl.bindTexture(this.gl.TEXTURE_2D, points.texture);
        this.gl.uniform1i(uniforms.get("uPoints"), 1);

        this.gl.activeTexture(this.gl.TEXTURE2);
        this.gl.bindTexture(this.gl.TEXTURE_2D, f.texture);
        this.gl.uniform1i(uniforms.get("uF"), 2);

        this.gl.uniform1i(uniforms.get("uRedBlack"), color);
        this.gl.uniform1f(uniforms.get("uOmega"), 1.9);

        this.gl.bindVertexArray(this.clipVao);
        this.gl.drawArrays(this.gl.TRIANGLE_FAN, 0, 4);
    }

    /* Clear framebuffers and textures used by multigrid. */
    public free(): void {
        super.free();

        this.gl.deleteTexture(this.grids[0].temp.texture);
        this.gl.deleteFramebuffer(this.grids[0].temp.framebuffer);

        for (let i = 1; i < this.grids.length; ++i) {
            for (const [k, v] of Object.entries(this.grids[i])) {
                if (k !== "size" && typeof v === "object") {
                    this.gl.deleteTexture(v.texture);
                    this.gl.deleteFramebuffer(v.framebuffer);
                }
            }
        }
    }
}
